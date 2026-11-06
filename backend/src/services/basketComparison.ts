import type { Prisma } from "@prisma/client";
import { activePrice, hasActiveDiscount, roundMoney } from "../utils/money";

/**
 * Honest basket comparison across stores, as a pure function (no DB) so the rules
 * are testable:
 *
 * - Only a store that has every item ("complete") can be ranked. A partial basket
 *   is always cheaper on paper because missing items cost 0, so it never gets
 *   isBest or a difference.
 * - "Cheapest" is claimed only when at least two complete baskets exist.
 * - Every missing item says why: the store's latest record marks it out of stock,
 *   or the store has no price for it in our data.
 * - Prices use the discount only while the promotion runs.
 */

export type BasketItemInput = { productId: string; productName: string; quantity: number };

export type StoreInput = { id: string; name: string; city: string; logoUrl?: string | null; sourceUrl?: string | null };

export type LatestPriceInput = {
  productId: string;
  storeId: string;
  price: Prisma.Decimal;
  oldPrice: Prisma.Decimal | null;
  discountPrice: Prisma.Decimal | null;
  promoEndsAt: Date | null;
  isAvailable: boolean;
  lastSeenAt: Date;
};

export type BasketLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  hasDiscount: boolean;
  checkedAt: Date;
};

export type MissingLine = {
  productId: string;
  productName: string;
  quantity: number;
  /** unavailable: the store's latest record says out of stock; no_price: no data for this store. */
  reason: "unavailable" | "no_price";
};

export type StoreBasket = {
  store: StoreInput;
  status: "complete" | "partial" | "no_data";
  /** Sum of the items found. For a partial basket it is NOT comparable with others. */
  totalPrice: number;
  foundCount: number;
  missingCount: number;
  items: BasketLine[];
  missing: MissingLine[];
  /** Names of missing items (kept for older app versions). */
  missingProducts: string[];
  /** True only for the cheapest complete basket(s) when two or more are complete. */
  isBest: boolean;
  /** Extra cost vs the cheapest complete basket; null when not comparable. */
  difference: number | null;
  /** Oldest "last checked" time among the prices used: how fresh this total is. */
  checkedAt: Date | null;
};

export type BasketVerdict =
  | { kind: "empty" }
  | { kind: "cheapest"; storeIds: string[]; total: number; spread: number; completeCount: number }
  | { kind: "single_complete"; storeId: string; total: number; partialCount: number }
  | { kind: "none_complete"; partialCount: number };

export type BasketComparison = {
  itemCount: number;
  verdict: BasketVerdict;
  stores: StoreBasket[];
};

export function compareBaskets(params: {
  items: BasketItemInput[];
  stores: StoreInput[];
  latestPrices: LatestPriceInput[];
  now?: Date;
}): BasketComparison {
  const { items, stores, latestPrices } = params;
  const now = params.now ?? new Date();
  const priceByKey = new Map(latestPrices.map((price) => [`${price.productId}:${price.storeId}`, price]));

  const baskets: StoreBasket[] = stores.map((store) => {
    const lines: BasketLine[] = [];
    const missing: MissingLine[] = [];

    for (const item of items) {
      const price = priceByKey.get(`${item.productId}:${store.id}`);
      if (!price || !price.isAvailable) {
        missing.push({ productId: item.productId, productName: item.productName, quantity: item.quantity, reason: price ? "unavailable" : "no_price" });
        continue;
      }
      const unitPrice = roundMoney(activePrice(price, now));
      lines.push({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice,
        lineTotal: roundMoney(unitPrice * item.quantity),
        hasDiscount: hasActiveDiscount(price, now),
        checkedAt: price.lastSeenAt
      });
    }

    const status: StoreBasket["status"] = lines.length === 0 ? "no_data" : missing.length === 0 ? "complete" : "partial";
    const checkedAt = lines.length ? new Date(Math.min(...lines.map((line) => line.checkedAt.getTime()))) : null;
    return {
      store,
      status,
      totalPrice: roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
      foundCount: lines.length,
      missingCount: missing.length,
      items: lines,
      missing,
      missingProducts: missing.map((line) => line.productName),
      isBest: false,
      difference: null,
      checkedAt
    };
  });

  const complete = baskets.filter((basket) => basket.status === "complete").sort((a, b) => a.totalPrice - b.totalPrice);
  const partial = baskets
    .filter((basket) => basket.status === "partial")
    .sort((a, b) => b.foundCount - a.foundCount || a.store.name.localeCompare(b.store.name, "uk"));
  const noData = baskets.filter((basket) => basket.status === "no_data").sort((a, b) => a.store.name.localeCompare(b.store.name, "uk"));

  let verdict: BasketVerdict;
  if (items.length === 0) {
    verdict = { kind: "empty" };
  } else if (complete.length >= 2) {
    const lowest = complete[0].totalPrice;
    for (const basket of complete) {
      basket.difference = roundMoney(basket.totalPrice - lowest);
      basket.isBest = basket.difference === 0;
    }
    verdict = {
      kind: "cheapest",
      storeIds: complete.filter((basket) => basket.isBest).map((basket) => basket.store.id),
      total: lowest,
      spread: roundMoney(complete[complete.length - 1].totalPrice - lowest),
      completeCount: complete.length
    };
  } else if (complete.length === 1) {
    verdict = { kind: "single_complete", storeId: complete[0].store.id, total: complete[0].totalPrice, partialCount: partial.length };
  } else {
    verdict = { kind: "none_complete", partialCount: partial.length };
  }

  return { itemCount: items.length, verdict, stores: [...complete, ...partial, ...noData] };
}
