import type { Prisma } from "@prisma/client";
import { isPriceFresh } from "../utils/freshness";
import { activePrice, hasActiveDiscount, roundMoney } from "../utils/money";
import { productKind, unitPrice, type Quantity } from "./productKind";

/**
 * Recommendation rules as pure functions (tested without a DB):
 * - a replacement must be the same kind of product (productKind) and cheaper per
 *   kg / l / piece by at least MIN_SAVING_PERCENT; packs of different units
 *   (kg vs l) are not compared;
 * - "below the 30-day average" uses a time-weighted average (each price counts
 *   for as long as it was valid) and needs at least a week of history.
 */

export const MIN_SAVING_PERCENT = 5;
const DAY = 24 * 60 * 60 * 1000;

export type StoreRef = { id: string; name: string };

export type LatestPrice = {
  storeId: string;
  store: StoreRef;
  price: Prisma.Decimal;
  oldPrice: Prisma.Decimal | null;
  discountPrice: Prisma.Decimal | null;
  promoEndsAt: Date | null;
  isAvailable: boolean;
  lastSeenAt: Date;
};

export type ProductWithLatest = {
  id: string;
  name: string;
  volume: string;
  /** Newest price row per store. */
  latest: LatestPrice[];
};

export type BestOffer = {
  store: StoreRef;
  packPrice: number;
  unitPrice: number;
  unit: Quantity["unit"];
  hasDiscount: boolean;
  promoEndsAt: Date | null;
};

/** Cheapest available offer of a product, by price per unit. */
export function bestOffer(product: ProductWithLatest, now = new Date()): BestOffer | null {
  let best: BestOffer | null = null;
  for (const row of product.latest) {
    if (!row.isAvailable || !isPriceFresh(row.lastSeenAt, now)) continue;
    const packPrice = roundMoney(activePrice(row, now));
    const perUnit = unitPrice(packPrice, product.volume);
    if (!perUnit) continue;
    if (!best || perUnit.value < best.unitPrice) {
      best = {
        store: row.store,
        packPrice,
        unitPrice: perUnit.value,
        unit: perUnit.unit,
        hasDiscount: hasActiveDiscount(row, now),
        promoEndsAt: hasActiveDiscount(row, now) ? row.promoEndsAt : null
      };
    }
  }
  return best;
}

export type Alternative = {
  productId: string;
  name: string;
  volume: string;
  offer: BestOffer;
  /** The target's cheapest price per the same unit. */
  targetUnitPrice: number;
  /** How much cheaper per unit, in percent. */
  savingPercent: number;
};

/** Cheaper products of the same kind, by price per unit, best first. */
export function findAlternatives(target: ProductWithLatest, candidates: ProductWithLatest[], options: { now?: Date; limit?: number } = {}): Alternative[] {
  const now = options.now ?? new Date();
  const kind = productKind(target.name);
  const targetOffer = bestOffer(target, now);
  if (!kind || !targetOffer) return [];

  const result: Alternative[] = [];
  for (const candidate of candidates) {
    if (candidate.id === target.id || productKind(candidate.name) !== kind) continue;
    const offer = bestOffer(candidate, now);
    if (!offer || offer.unit !== targetOffer.unit) continue;
    const savingPercent = Math.round(((targetOffer.unitPrice - offer.unitPrice) / targetOffer.unitPrice) * 100);
    if (savingPercent < MIN_SAVING_PERCENT) continue;
    result.push({ productId: candidate.id, name: candidate.name, volume: candidate.volume, offer, targetUnitPrice: targetOffer.unitPrice, savingPercent });
  }
  return result.sort((a, b) => b.savingPercent - a.savingPercent).slice(0, options.limit ?? 5);
}

export type PricePeriod = { value: number; from: Date; to: Date };

/**
 * Average price over [windowStart, now], each period weighted by how long it was
 * valid inside the window. Returns null when the history covers less than
 * minDays of the window: too little to call a price "below average".
 */
export function timeWeightedAverage(periods: PricePeriod[], windowStart: Date, now: Date, minDays = 7): number | null {
  let weighted = 0;
  let covered = 0;
  for (const period of periods) {
    const from = Math.max(period.from.getTime(), windowStart.getTime());
    const to = Math.min(period.to.getTime(), now.getTime());
    if (to <= from) continue;
    weighted += period.value * (to - from);
    covered += to - from;
  }
  if (covered < minDays * DAY) return null;
  return roundMoney(weighted / covered);
}

/**
 * Turns a store's price history into periods: each row is valid from its
 * dateCollected until the next row (or until it was last confirmed, for the
 * latest one).
 */
export function periodsFromHistory(rows: Array<{ value: number; dateCollected: Date; lastSeenAt: Date }>): PricePeriod[] {
  const sorted = [...rows].sort((a, b) => a.dateCollected.getTime() - b.dateCollected.getTime());
  return sorted.map((row, index) => ({
    value: row.value,
    from: row.dateCollected,
    to: index + 1 < sorted.length ? sorted[index + 1].dateCollected : row.lastSeenAt
  }));
}
