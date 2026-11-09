import type { Prisma } from "@prisma/client";
import { isPriceFresh, maxPriceAgeMs } from "../utils/freshness";
import { activePrice, hasActiveDiscount, roundMoney } from "../utils/money";
import type { StoreRef } from "./recommendations";

/**
 * Says whether a product's current price is good compared with its own history.
 * All figures are weighted by how long each price lasted, so a one-day spike counts
 * less than a price that held for a month. With under two weeks of observations the
 * answer is "not enough data" rather than a guess.
 */

export const ANALYSIS_WINDOW_DAYS = 90;
export const MIN_OBSERVED_DAYS = 14;
const GOOD_BELOW_AVERAGE = 0.05;
const HIGH_ABOVE_AVERAGE = 0.05;
const GOOD_CHEAPER_THAN_SHARE = 0.6;
const DAY = 24 * 60 * 60 * 1000;

export type HistoryRow = {
  price: Prisma.Decimal;
  oldPrice: Prisma.Decimal | null;
  discountPrice: Prisma.Decimal | null;
  promoEndsAt: Date | null;
  isAvailable: boolean;
  dateCollected: Date;
  lastSeenAt: Date;
};

export type PriceSignal = "good" | "normal" | "high" | "insufficient";

export type StoreAnalysis = {
  store: StoreRef;
  current: number;
  hasDiscount: boolean;
  observedDays: number;
  /** How many times the price changed in the window. */
  changes: number;
  min: number;
  max: number;
  average: number;
  /** Share of observed time (0–1) the product was on promotion. */
  promoShare: number;
  /** Share of observed time (0–1) the price was higher than it is now. */
  cheaperThanShare: number;
  signal: PriceSignal;
};

export type ProductAnalysis = {
  signal: PriceSignal;
  /** The store with the lowest confirmed price, which the signal describes. */
  reference: StoreAnalysis | null;
  stores: StoreAnalysis[];
  windowDays: number;
  minObservedDays: number;
  /** Plain-language reasons built from the figures above. */
  reasons: string[];
};

const money = (value: number) => `${value.toFixed(2).replace(".", ",")} грн`;
const percent = (share: number) => `${Math.round(share * 100)}%`;

export function analyzeStoreHistory(store: StoreRef, rows: HistoryRow[], now: Date, maxAgeMs = maxPriceAgeMs()): StoreAnalysis | null {
  const sorted = [...rows].sort((a, b) => a.dateCollected.getTime() - b.dateCollected.getTime());
  const latest = sorted[sorted.length - 1];
  if (!latest || !latest.isAvailable || !isPriceFresh(latest.lastSeenAt, now, maxAgeMs)) return null;

  const windowStart = now.getTime() - ANALYSIS_WINDOW_DAYS * DAY;
  const periods = sorted.flatMap((row, index) => {
    const from = Math.max(row.dateCollected.getTime(), windowStart);
    const end = index + 1 < sorted.length ? sorted[index + 1].dateCollected : row.lastSeenAt;
    const to = Math.min(end.getTime(), now.getTime());
    return row.isAvailable && to > from
      ? [{ value: activePrice(row, row.dateCollected), onPromo: hasActiveDiscount(row, row.dateCollected), duration: to - from }]
      : [];
  });

  const current = roundMoney(activePrice(latest, now));
  const hasDiscount = hasActiveDiscount(latest, now);
  const covered = periods.reduce((sum, period) => sum + period.duration, 0);
  const observedDays = Math.floor(covered / DAY);
  const values = periods.map((period) => period.value);
  const average = covered ? roundMoney(periods.reduce((sum, period) => sum + period.value * period.duration, 0) / covered) : current;
  const share = (test: (period: (typeof periods)[number]) => boolean) =>
    covered ? periods.filter(test).reduce((sum, period) => sum + period.duration, 0) / covered : 0;
  const cheaperThanShare = share((period) => period.value > current);

  let signal: PriceSignal = "normal";
  if (observedDays < MIN_OBSERVED_DAYS) signal = "insufficient";
  else if (current <= average * (1 - GOOD_BELOW_AVERAGE) && cheaperThanShare >= GOOD_CHEAPER_THAN_SHARE) signal = "good";
  else if (current >= average * (1 + HIGH_ABOVE_AVERAGE)) signal = "high";

  return {
    store,
    current,
    hasDiscount,
    observedDays,
    changes: Math.max(0, periods.length - 1),
    min: values.length ? roundMoney(Math.min(...values)) : current,
    max: values.length ? roundMoney(Math.max(...values)) : current,
    average,
    promoShare: Math.round(share((period) => period.onPromo) * 100) / 100,
    cheaperThanShare: Math.round(cheaperThanShare * 100) / 100,
    signal
  };
}

export function analyzeProduct(histories: Array<{ store: StoreRef; rows: HistoryRow[] }>, now = new Date(), maxAgeMs = maxPriceAgeMs()): ProductAnalysis {
  const stores = histories
    .flatMap(({ store, rows }) => {
      const analysis = analyzeStoreHistory(store, rows, now, maxAgeMs);
      return analysis ? [analysis] : [];
    })
    .sort((a, b) => a.current - b.current);
  const reference = stores[0] ?? null;
  const base = { stores, reference, windowDays: ANALYSIS_WINDOW_DAYS, minObservedDays: MIN_OBSERVED_DAYS };

  if (!reference) return { ...base, signal: "insufficient", reasons: ["Немає підтвердженої ціни, тому оцінити її неможливо."] };

  if (reference.signal === "insufficient") {
    return {
      ...base,
      signal: "insufficient",
      reasons: [`Ціну в ${reference.store.name} спостерігаємо ${reference.observedDays} дн., а для висновку потрібно щонайменше ${MIN_OBSERVED_DAYS}.`]
    };
  }

  const difference = roundMoney(reference.average - reference.current);
  const reasons = [
    `${reference.store.name}: ${money(reference.current)}, середня за ${reference.observedDays} дн. — ${money(reference.average)}.`,
    `Діапазон за цей час: ${money(reference.min)} – ${money(reference.max)}, ціна змінювалась ${reference.changes} раз.`,
    `Зараз дешевше, ніж ${percent(reference.cheaperThanShare)} часу спостережень.`
  ];
  if (reference.promoShare > 0) reasons.push(`В акції товар був ${percent(reference.promoShare)} часу${reference.hasDiscount ? ", зараз теж" : ""}.`);
  if (reference.signal === "good") reasons.unshift(`Ціна на ${money(difference)} нижча за середню: вигідний момент.`);
  else if (reference.signal === "high") reasons.unshift(`Ціна на ${money(-difference)} вища за середню: якщо можна, варто зачекати.`);
  else reasons.unshift("Ціна близька до звичайної.");

  return { ...base, signal: reference.signal, reasons };
}
