import { isPriceFresh, maxPriceAgeMs } from "../utils/freshness";
import { activePrice, hasActiveDiscount, roundMoney } from "../utils/money";
import type { BasketItemInput, LatestPriceInput, StoreInput } from "./basketComparison";

/**
 * Splits a basket between stores. For each number of stores (1, 2, 3) it finds the
 * best set by checking every combination, so the answer is exact rather than a
 * heuristic: with a handful of chains there are few combinations. Within a set, every
 * item goes to the cheapest store that has it.
 *
 * Going to one more store costs the shopper time and travel, so the recommendation
 * weighs the saving against extraStoreCost (set by the user). Plans are only compared
 * on the same coverage: a plan is never "cheaper" because it leaves items out.
 */

export const MAX_STORES_IN_PLAN = 3;

export type PlanItem = { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; hasDiscount: boolean };

export type PlanStop = { store: StoreInput; items: PlanItem[]; total: number };

export type BasketPlan = {
  storeCount: number;
  stops: PlanStop[];
  total: number;
  coveredCount: number;
  missing: Array<{ productId: string; productName: string }>;
  /** Saving against the best single store; null when that store covers fewer items. */
  savingVsOneStore: number | null;
  isRecommended: boolean;
  /** Plain-language reasons for this plan, built from its numbers. */
  explanation: string[];
};

export type BasketPlanResult = {
  itemCount: number;
  extraStoreCost: number;
  plans: BasketPlan[];
  /** Why the recommended plan won; empty when there is nothing to recommend. */
  summary: string | null;
};

type Offer = { unitPrice: number; hasDiscount: boolean };

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]));
}

const money = (value: number) => `${value.toFixed(2).replace(".", ",")} грн`;

export function optimizeBasket(params: {
  items: BasketItemInput[];
  stores: StoreInput[];
  latestPrices: LatestPriceInput[];
  extraStoreCost?: number;
  now?: Date;
  maxAgeMs?: number;
}): BasketPlanResult {
  const { items, stores, latestPrices } = params;
  const extraStoreCost = Math.max(0, params.extraStoreCost ?? 0);
  const now = params.now ?? new Date();
  const maxAgeMs = params.maxAgeMs ?? maxPriceAgeMs();
  if (!items.length) return { itemCount: 0, extraStoreCost, plans: [], summary: null };

  const offers = new Map<string, Offer>();
  for (const price of latestPrices) {
    if (!price.isAvailable || !isPriceFresh(price.lastSeenAt, now, maxAgeMs)) continue;
    offers.set(`${price.productId}:${price.storeId}`, { unitPrice: roundMoney(activePrice(price, now)), hasDiscount: hasActiveDiscount(price, now) });
  }

  const buildPlan = (subset: StoreInput[]): Omit<BasketPlan, "savingVsOneStore" | "isRecommended" | "explanation"> => {
    const lines = new Map<string, PlanItem[]>();
    const missing: BasketPlan["missing"] = [];
    for (const item of items) {
      let best: { store: StoreInput; offer: Offer } | null = null;
      for (const store of subset) {
        const offer = offers.get(`${item.productId}:${store.id}`);
        if (offer && (!best || offer.unitPrice < best.offer.unitPrice)) best = { store, offer };
      }
      if (!best) {
        missing.push({ productId: item.productId, productName: item.productName });
        continue;
      }
      const line: PlanItem = { ...item, unitPrice: best.offer.unitPrice, lineTotal: roundMoney(best.offer.unitPrice * item.quantity), hasDiscount: best.offer.hasDiscount };
      lines.set(best.store.id, [...(lines.get(best.store.id) ?? []), line]);
    }
    const stops = subset
      .filter((store) => lines.has(store.id))
      .map((store) => {
        const stopItems = lines.get(store.id)!;
        return { store, items: stopItems, total: roundMoney(stopItems.reduce((sum, line) => sum + line.lineTotal, 0)) };
      });
    return {
      storeCount: stops.length,
      stops,
      total: roundMoney(stops.reduce((sum, stop) => sum + stop.total, 0)),
      coveredCount: items.length - missing.length,
      missing
    };
  };

  // Best plan for each number of stores: more items first, then the lower total.
  const sorted = [...stores].sort((a, b) => a.name.localeCompare(b.name, "uk"));
  const bestByCount = new Map<number, ReturnType<typeof buildPlan>>();
  for (let size = 1; size <= Math.min(MAX_STORES_IN_PLAN, sorted.length); size += 1) {
    for (const subset of combinations(sorted, size)) {
      const plan = buildPlan(subset);
      if (plan.storeCount !== size) continue; // a store with nothing to buy adds no plan
      const current = bestByCount.get(size);
      if (!current || plan.coveredCount > current.coveredCount || (plan.coveredCount === current.coveredCount && plan.total < current.total)) {
        bestByCount.set(size, plan);
      }
    }
  }

  const raw = [...bestByCount.values()].sort((a, b) => a.storeCount - b.storeCount);
  if (!raw.length) {
    return { itemCount: items.length, extraStoreCost, plans: [], summary: "Для цього кошика немає підтверджених цін, тому план побудувати неможливо." };
  }

  const single = raw.find((plan) => plan.storeCount === 1);
  const maxCovered = Math.max(...raw.map((plan) => plan.coveredCount));
  // The recommendation only considers plans that buy as much as possible.
  const effective = (plan: (typeof raw)[number]) => plan.total + (plan.storeCount - 1) * extraStoreCost;
  const recommended = raw.filter((plan) => plan.coveredCount === maxCovered).reduce((best, plan) => (effective(plan) < effective(best) ? plan : best));

  const plans: BasketPlan[] = raw.map((plan) => {
    const savingVsOneStore = single && plan.storeCount > 1 && single.coveredCount === plan.coveredCount ? roundMoney(single.total - plan.total) : null;
    const explanation: string[] = [];
    if (plan.storeCount === 1) explanation.push(`Усе в одному магазині: ${plan.stops[0].store.name}.`);
    else explanation.push(`Кожен товар куплено там, де він найдешевший серед: ${plan.stops.map((stop) => stop.store.name).join(", ")}.`);
    if (savingVsOneStore !== null) {
      const extra = (plan.storeCount - 1) * extraStoreCost;
      explanation.push(extra > 0 ? `Економія ${money(savingVsOneStore)} проти одного магазину, а додаткові поїздки ви оцінили в ${money(extra)}.` : `Економія ${money(savingVsOneStore)} проти одного магазину.`);
    } else if (single && plan.storeCount > 1 && plan.coveredCount > single.coveredCount) {
      explanation.push(`Купує більше товарів, ніж будь-який один магазин: ${plan.coveredCount} проти ${single.coveredCount}. Суми через це напряму не порівнюються.`);
    }
    if (plan.missing.length) explanation.push(`Не вистачає: ${plan.missing.map((line) => line.productName).join(", ")}.`);
    return { ...plan, savingVsOneStore, isRecommended: plan === recommended, explanation };
  });

  const best = plans.find((plan) => plan.isRecommended)!;
  let summary: string;
  if (best.coveredCount < items.length) {
    summary = `Жодна комбінація магазинів не має всіх товарів. Найбільше можна купити так: ${best.coveredCount} із ${items.length}.`;
  } else if (best.storeCount === 1) {
    const next = plans.find((plan) => plan.storeCount === 2 && plan.coveredCount === best.coveredCount);
    summary = next?.savingVsOneStore
      ? `Другий магазин заощадив би лише ${money(next.savingVsOneStore)}${extraStoreCost > 0 ? `, менше за вашу вартість поїздки ${money(extraStoreCost)}` : ""}, тому вигідніше купити все в одному.`
      : "Додатковий магазин не дає економії, тому вигідніше купити все в одному.";
  } else {
    summary = `Вигідніше розділити покупку між ${best.storeCount} магазинами${best.savingVsOneStore !== null ? `: економія ${money(best.savingVsOneStore)} проти одного магазину` : ""}.`;
  }

  return { itemCount: items.length, extraStoreCost, plans, summary };
}
