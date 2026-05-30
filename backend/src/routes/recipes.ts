import { Router } from "express";
import { z } from "zod";
import { Product } from "@prisma/client";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

type IngredientDraft = {
  product?: Product;
  quantity?: number;
};

type RecipeDraft = {
  title: string;
  description: string;
  imageUrl?: string | null;
  ingredients: Array<{ product: Product; quantity: number }>;
};

function findProduct(products: Product[], patterns: RegExp[]) {
  return products.find((product) => {
    const text = `${product.name} ${product.brand} ${product.category}`.toLowerCase();
    return patterns.some((pattern) => pattern.test(text));
  });
}

function buildRecipe(title: string, description: string, imageProduct: Product | undefined, ingredients: IngredientDraft[]): RecipeDraft | null {
  const resolvedIngredients = ingredients
    .filter((ingredient): ingredient is { product: Product; quantity?: number } => Boolean(ingredient.product))
    .map((ingredient) => ({ product: ingredient.product, quantity: ingredient.quantity ?? 1 }));

  if (!imageProduct || resolvedIngredients.length < 2) return null;
  return { title, description, imageUrl: imageProduct.imageUrl, ingredients: resolvedIngredients };
}

async function ensureDefaultRecipes() {
  const existingCount = await prisma.recipe.count();
  if (existingCount > 0) return;

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const avocado = findProduct(products, [/авокадо/i]);
  const bread = findProduct(products, [/батон|хліб/i]);
  const creamCheese = findProduct(products, [/крем-сир|моцарелла|фелата|сир/i]);
  const chicken = findProduct(products, [/філе куряче|стегно курчати|фарш куряч/i]);
  const pepper = findProduct(products, [/перець/i]);
  const cabbage = findProduct(products, [/капуста/i]);
  const cucumber = findProduct(products, [/огірок/i]);
  const oil = findProduct(products, [/олія/i]);
  const buckwheat = findProduct(products, [/греч/i]);
  const milk = findProduct(products, [/молоко/i]);
  const butter = findProduct(products, [/масло/i]);
  const yogurt = findProduct(products, [/йогурт/i]);
  const kefir = findProduct(products, [/кефір/i]);
  const water = findProduct(products, [/вода/i]);

  const recipes = [
    buildRecipe("Авокадо-тост", "Швидкий сніданок із батоном, авокадо та вершковим сиром.", avocado, [
      { product: bread },
      { product: avocado },
      { product: creamCheese }
    ]),
    buildRecipe("Курка з овочевим гарніром", "Базове меню для обіду: курка, перець, капуста та оливкова олія.", chicken, [
      { product: chicken },
      { product: pepper },
      { product: cabbage },
      { product: oil }
    ]),
    buildRecipe("Овочевий салат із сиром", "Легкий салат із сезонних овочів, сиру та оливкової олії.", cucumber ?? cabbage, [
      { product: cucumber },
      { product: pepper },
      { product: cabbage },
      { product: creamCheese },
      { product: oil }
    ]),
    buildRecipe("Гречана каша з молоком", "Недорогий сніданок або гарнір із гречки, молока та масла.", buckwheat, [
      { product: buckwheat },
      { product: milk },
      { product: butter }
    ]),
    buildRecipe("Молочний перекус", "Легка добірка для перекусу: йогурт, кефір і вода.", yogurt, [
      { product: yogurt },
      { product: kefir },
      { product: water }
    ])
  ].filter((recipe): recipe is RecipeDraft => Boolean(recipe));

  for (const recipe of recipes) {
    await prisma.recipe.create({
      data: {
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        items: {
          create: recipe.ingredients.map((ingredient) => ({
            productId: ingredient.product.id,
            quantity: ingredient.quantity
          }))
        }
      }
    });
  }
}

router.get("/", async (_req, res) => {
  await ensureDefaultRecipes();
  res.json(await prisma.recipe.findMany({ include: { items: { include: { product: true } } }, orderBy: { title: "asc" } }));
});

router.get("/:id", async (req, res) => {
  await ensureDefaultRecipes();
  const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id }, include: { items: { include: { product: true } } } });
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });
  res.json(recipe);
});

router.post("/:id/add-to-shopping-list", requireAuth, async (req: AuthRequest, res) => {
  const body = z.object({ shoppingListId: z.string().optional(), title: z.string().optional() }).parse(req.body);
  const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });

  const list =
    body.shoppingListId
      ? await prisma.shoppingList.findFirstOrThrow({ where: { id: body.shoppingListId, userId: req.userId } })
      : await prisma.shoppingList.create({ data: { title: body.title || recipe.title, userId: req.userId! } });

  for (const item of recipe.items) {
    await prisma.shoppingListItem.upsert({
      where: { shoppingListId_productId: { shoppingListId: list.id, productId: item.productId } },
      update: { quantity: { increment: item.quantity } },
      create: { shoppingListId: list.id, productId: item.productId, quantity: item.quantity }
    });
  }

  res.json(await prisma.shoppingList.findUnique({ where: { id: list.id }, include: { items: { include: { product: true } } } }));
});

export default router;
