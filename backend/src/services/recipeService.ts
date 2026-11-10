import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { isPriceFresh } from "../utils/freshness";
import { activePrice, roundMoney } from "../utils/money";
import { RECIPE_CATALOG } from "./recipeCatalog";
import { latestPricesInclude } from "./latestPrices";
import { chooseProduct, ingredientFit, isRecipeComplete, parseServings } from "./recipePlanning";

type PriceRow = Prisma.PriceGetPayload<object>;

function confirmedPrices<T extends PriceRow>(prices: T[], now: Date) {
  return prices.filter((price) => price.isAvailable && isPriceFresh(price.lastSeenAt, now));
}

function lowestPrice(prices: PriceRow[], now: Date) {
  const confirmed = confirmedPrices(prices, now);
  return confirmed.length ? Math.min(...confirmed.map((price) => activePrice(price, now))) : null;
}

const recipeInclude = (excludedStoreIds: string[]) =>
  ({
    items: {
      orderBy: { position: "asc" as const },
      include: { product: { include: latestPricesInclude(excludedStoreIds) } }
    }
  }) satisfies Prisma.RecipeInclude;

type LoadedRecipe = Prisma.RecipeGetPayload<{ include: ReturnType<typeof recipeInclude> }>;

/**
 * Adds missing starter recipes and re-picks the product of every ingredient from
 * the current catalogue. Runs at startup and after each price collection, so recipes
 * complete themselves as the catalogue grows and drop a product that stopped selling.
 */
export async function syncRecipes() {
  const known = new Set((await prisma.recipe.findMany({ select: { slug: true } })).map((recipe) => recipe.slug));
  for (const draft of RECIPE_CATALOG) {
    if (known.has(draft.slug)) continue;
    const { ingredients, ...recipe } = draft;
    await prisma.recipe.create({
      data: {
        ...recipe,
        items: {
          create: ingredients.map(({ optional, ...ingredient }, position) => ({ ...ingredient, optional: optional ?? false, position }))
        }
      }
    });
  }

  const recipes = await prisma.recipe.findMany({ include: { items: { orderBy: { position: "asc" } } } });
  const terms = [...new Set(recipes.flatMap((recipe) => recipe.items.flatMap((item) => item.includeTerms)))];
  if (!terms.length) return;

  const now = new Date();
  const products = await prisma.product.findMany({
    where: { OR: terms.map((term) => ({ name: { startsWith: term, mode: "insensitive" as const } })) },
    include: latestPricesInclude([])
  });
  const candidates = products.map((product) => ({
    ...product,
    lowestPrice: lowestPrice(product.prices, now),
    storeCount: new Set(confirmedPrices(product.prices, now).map((price) => price.storeId)).size
  }));

  for (const recipe of recipes) {
    let imageUrl: string | null = null;
    for (const item of recipe.items) {
      const product = chooseProduct(item, candidates);
      const productId = product?.id ?? null;
      if (productId !== item.productId) await prisma.recipeItem.update({ where: { id: item.id }, data: { productId } });
      if (!imageUrl && !item.optional) imageUrl = product?.imageUrl ?? null;
    }
    if (imageUrl !== recipe.imageUrl) await prisma.recipe.update({ where: { id: recipe.id }, data: { imageUrl } });
  }
}

function presentRecipe(recipe: LoadedRecipe, requestedServings: unknown, now: Date) {
  const servings = parseServings(requestedServings, recipe.servings);
  const scale = servings / recipe.servings;
  let dish = 0;
  let purchase = 0;
  let unpriced = 0;

  const items = recipe.items.map((item) => {
    const fit = item.product ? ingredientFit(item, item.product, scale) : null;
    const lowest = item.product ? lowestPrice(item.product.prices, now) : null;
    const dishCost = fit && lowest !== null ? roundMoney(lowest * fit.share) : null;
    const purchaseCost = fit && lowest !== null ? roundMoney(lowest * fit.packs) : null;
    if (!item.optional) {
      if (dishCost === null || purchaseCost === null) unpriced += 1;
      else {
        dish += dishCost;
        purchase += purchaseCost;
      }
    }
    return {
      id: item.id,
      name: item.name,
      amount: fit?.amount ?? item.amount,
      unit: item.unit,
      optional: item.optional,
      quantity: fit?.packs ?? 1,
      lowestPrice: lowest,
      dishCost,
      purchaseCost,
      product: item.product
    };
  });

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    guide: { durationMinutes: recipe.durationMinutes, servings, difficulty: recipe.difficulty, steps: recipe.steps },
    items,
    cost: { dish: roundMoney(dish), purchase: roundMoney(purchase), unpriced }
  };
}

export async function listRecipes(excludedStoreIds: string[]) {
  const recipes = await prisma.recipe.findMany({ include: recipeInclude(excludedStoreIds), orderBy: { title: "asc" } });
  const now = new Date();
  return recipes.filter((recipe) => isRecipeComplete(recipe.items)).map((recipe) => presentRecipe(recipe, undefined, now));
}

export async function getRecipe(id: string, servings: unknown, excludedStoreIds: string[]) {
  const recipe = await prisma.recipe.findUnique({ where: { id }, include: recipeInclude(excludedStoreIds) });
  return recipe && isRecipeComplete(recipe.items) ? presentRecipe(recipe, servings, new Date()) : null;
}
