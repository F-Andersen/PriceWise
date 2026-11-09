import { FLAVOURS, parseQuantity } from "../../services/productKind";

/**
 * Finds pairs of products that may be the same item with different codes, for a
 * person to confirm. Nothing here merges anything. Rules:
 * - the pack size must match;
 * - two products sold by one store are different items, so they are never paired;
 * - same_name: the name matches after ignoring word order, punctuation and pack size;
 * - similar_name: same brand and nearly the same name, unless the words that differ
 *   are numbers (fat %, count) or flavours.
 */

export type MatchProduct = { id: string; name: string; brand: string; volume: string; storeIds: string[] };

export type CandidatePair = { productAId: string; productBId: string; score: number; reason: "same_name" | "similar_name" };

const SIZE = /\d+(?:[.,]\d+)?\s*(?:кг|г|мл|л|шт)(?!\p{L})/giu;
const MIN_SIMILARITY = 0.75;
const MAX_SIMILAR_SCORE = 94;

export function nameTokens(name: string): string[] {
  const tokens = name
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/[ʼ’`]/g, "'")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(SIZE, " ")
    .replace(/[«»"(),~/№]+/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[.\-']+|[.\-']+$/g, ""))
    .filter(Boolean);
  return [...new Set(tokens)].sort();
}

function packKey(volume: string) {
  const quantity = parseQuantity(volume);
  return quantity ? `${quantity.amount}${quantity.unit}` : volume.trim().toLowerCase();
}

const NO_BRAND = new Set(["без бренду", "без тм"]);

const brandKey = (brand: string) => {
  const value = brand.trim().toLowerCase();
  return NO_BRAND.has(value) ? "" : value;
};

/** Words that make it a different product even when the rest of the name matches. */
const VARIANT_WORDS = ["безлактоз", "нарізан", "сирокопчен", "варен", "копчен", "заморожен", "охолоджен", "підплавлен", "сир", "дитяч", "преміум"];

const shareStore = (a: MatchProduct, b: MatchProduct) => a.storeIds.some((id) => b.storeIds.includes(id));

/** Why two names differ only matters if the difference could be the product itself. */
function differenceIsMeaningful(tokens: string[]) {
  return tokens.some((token) => /\d/.test(token) || [...FLAVOURS, ...VARIANT_WORDS].some((stem) => token.startsWith(stem)));
}

function similarity(a: string[], b: string[]) {
  const onlyA = a.filter((token) => !b.includes(token));
  const onlyB = b.filter((token) => !a.includes(token));
  const union = a.length + onlyB.length;
  return { score: union ? (a.length - onlyA.length) / union : 0, different: [...onlyA, ...onlyB] };
}

export function findCandidatePairs(products: MatchProduct[]): CandidatePair[] {
  const prepared = products.map((product) => ({ product, tokens: nameTokens(product.name), pack: packKey(product.volume), brand: brandKey(product.brand) }));
  const pairs = new Map<string, CandidatePair>();

  const add = (a: MatchProduct, b: MatchProduct, score: number, reason: CandidatePair["reason"]) => {
    if (shareStore(a, b)) return;
    const [productAId, productBId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
    const key = `${productAId}:${productBId}`;
    const existing = pairs.get(key);
    if (!existing || existing.score < score) pairs.set(key, { productAId, productBId, score, reason });
  };

  const groupBy = (keyOf: (item: (typeof prepared)[number]) => string | null) => {
    const groups = new Map<string, typeof prepared>();
    for (const item of prepared) {
      const key = keyOf(item);
      if (key) groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return groups.values();
  };

  for (const group of groupBy((item) => (item.tokens.length ? `${item.pack}|${item.tokens.join(" ")}` : null))) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) add(group[i].product, group[j].product, 95, "same_name");
    }
  }

  for (const group of groupBy((item) => (item.brand ? `${item.pack}|${item.brand}` : null))) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const { score, different } = similarity(group[i].tokens, group[j].tokens);
        if (score >= MIN_SIMILARITY && score < 1 && !differenceIsMeaningful(different)) {
          add(group[i].product, group[j].product, Math.min(MAX_SIMILAR_SCORE, Math.round(score * 100)), "similar_name");
        }
      }
    }
  }

  return [...pairs.values()].sort((a, b) => b.score - a.score);
}
