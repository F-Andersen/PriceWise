import { parseQuantity, Quantity } from "./productKind";

/**
 * Pure rules for recipes: which catalogue product can stand in for an ingredient
 * and what the ingredient costs. Two sums are kept apart on purpose: the cost of
 * the dish (only the amount it uses) and the purchase (whole packs, as in the cart).
 */

export type IngredientRule = {
  amount: number;
  unit: string;
  categories: string[];
  includeTerms: string[];
  excludeTerms: string[];
};

export type RecipeProduct = { name: string; category: string; volume: string };
export type CandidateProduct = RecipeProduct & { id: string; lowestPrice: number | null; storeCount: number };
export type IngredientFit = { amount: number; share: number; packs: number };

/** Nobody buys a 10 kg sack of sugar for one dish. */
const MAX_PACK = 5;
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

function normalize(text: string) {
  return text.toLowerCase().replace(/[ʼ’`]/g, "'").trim();
}

/** Includes match the start of the name, so "перець" is not "шніцель з перцем". */
export function matchesIngredient(rule: IngredientRule, product: RecipeProduct) {
  const name = normalize(product.name);
  if (rule.categories.length && !rule.categories.includes(product.category)) return false;
  if (!rule.includeTerms.some((term) => name.startsWith(normalize(term)))) return false;
  return !rule.excludeTerms.some((term) => name.includes(normalize(term)));
}

/** Some multipacks are listed as "1 шт" with the real count only in the name ("10шт"). */
export function packSize(product: RecipeProduct): Quantity | null {
  const quantity = parseQuantity(product.volume);
  if (quantity?.unit === "шт" && quantity.amount === 1) {
    const inName = product.name.match(/(\d+)\s*шт(?!\p{L})/iu);
    if (inName && Number(inName[1]) > 1) return { amount: Number(inName[1]), unit: "шт" };
  }
  return quantity;
}

/** Whole pieces, and grams or millilitres to the nearest 5, so amounts stay usable. */
export function scaleAmount(amount: number, unit: string, scale: number) {
  const scaled = amount * scale;
  return unit === "шт" ? Math.ceil(scaled - 1e-9) : Math.max(5, Math.round(scaled / 5) * 5);
}

/**
 * How much of a pack the ingredient takes and how many packs to buy, or null if
 * they are measured differently. Grams and millilitres count as equal: milk is
 * often listed in grams and the error is small next to the price itself.
 */
export function ingredientFit(rule: Pick<IngredientRule, "amount" | "unit">, product: RecipeProduct, scale = 1): IngredientFit | null {
  const pack = packSize(product);
  if (!pack) return null;
  const needsPieces = rule.unit === "шт";
  if (needsPieces !== (pack.unit === "шт")) return null;
  const amount = scaleAmount(rule.amount, rule.unit, scale);
  const need = needsPieces ? amount : amount / 1000;
  const share = need / pack.amount;
  return { amount, share, packs: Math.max(1, Math.ceil(share - 1e-9)) };
}

/**
 * Picks the product for an ingredient: only priced, sensible packs; first the one
 * sold in the most chains, because it can be compared, then the cheapest to buy.
 */
export function chooseProduct<T extends CandidateProduct>(rule: IngredientRule, candidates: T[]): T | null {
  const ranked = candidates.flatMap((product) => {
    if (product.lowestPrice === null || !matchesIngredient(rule, product)) return [];
    const fit = ingredientFit(rule, product);
    const pack = packSize(product);
    if (!fit || !pack || (pack.unit !== "шт" && pack.amount > MAX_PACK)) return [];
    return [{ product, purchase: product.lowestPrice * fit.packs }];
  });
  ranked.sort((a, b) => b.product.storeCount - a.product.storeCount || a.purchase - b.purchase || a.product.id.localeCompare(b.product.id));
  return ranked[0]?.product ?? null;
}

/** A recipe is shown only if every ingredient it cannot do without was found. */
export function isRecipeComplete(items: Array<{ optional: boolean; productId: string | null }>) {
  return items.length > 0 && items.every((item) => item.optional || item.productId !== null);
}

export function parseServings(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= MIN_SERVINGS && parsed <= MAX_SERVINGS ? parsed : fallback;
}
