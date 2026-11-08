/**
 * How long a price stays confirmed after the last collection that saw it. Older
 * prices are "not confirmed": they are shown as such and never decide the cheapest
 * basket. 72 h allows two missed daily collections.
 * PRICE_MAX_AGE_HOURS overrides it. The app uses the same limit (utils/prices.ts).
 */
const DEFAULT_MAX_AGE_HOURS = 72;
const HOUR = 60 * 60 * 1000;

export function maxPriceAgeMs(value = process.env.PRICE_MAX_AGE_HOURS) {
  const parsed = Number(value);
  return (value !== undefined && value.trim() !== "" && Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_AGE_HOURS) * HOUR;
}

export function isPriceFresh(lastSeenAt: Date, now = new Date(), maxAgeMs = maxPriceAgeMs()) {
  return now.getTime() - lastSeenAt.getTime() <= maxAgeMs;
}
