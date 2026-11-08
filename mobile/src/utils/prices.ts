import { MarketPrice, Price, Product } from "../types";

export function numberPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** Знижка діє, якщо вона є і магазин не повідомив, що акція вже закінчилась. */
export function hasActiveDiscount(price: Price) {
  if (price.discountPrice === null || price.discountPrice === undefined) return false;
  return !price.promoEndsAt || +new Date(price.promoEndsAt) >= Date.now();
}

/** Звичайна ціна без знижки. */
export function regularPrice(price: Price) {
  return numberPrice(price.oldPrice ?? price.price);
}

/** Ціна, яку покупець заплатить зараз; після кінця акції — звичайна. */
export function activePrice(price: Price) {
  if (hasActiveDiscount(price)) return numberPrice(price.discountPrice);
  if (price.discountPrice !== null && price.discountPrice !== undefined) return regularPrice(price);
  return numberPrice(price.price);
}

/** «до 10.11» для дати кінця акції. */
export function promoUntilLabel(value: string | Date) {
  const date = new Date(value);
  return `до ${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Коли ціну востаннє підтвердив збір — саме це «станом на» для покупця. */
export function checkedAt(price: { dateCollected: string; lastSeenAt?: string }) {
  return price.lastSeenAt ?? price.dateCollected;
}

export function latestByStore(prices: Price[] = []) {
  const map = new Map<string, Price>();
  for (const price of [...prices].sort((a, b) => +new Date(b.dateCollected) - +new Date(a.dateCollected))) {
    if (!map.has(price.storeId)) map.set(price.storeId, price);
  }
  return Array.from(map.values());
}

export function minProductPrice(product: Product) {
  const available = latestByStore(product.prices).filter(isConfirmedPrice);
  if (!available.length) return null;
  return Math.min(...available.map(activePrice));
}

export function cheapestAvailablePrice(product: Product) {
  const available = latestByStore(product.prices).filter(isConfirmedPrice);
  if (!available.length) return null;
  return available.reduce((best, price) => (activePrice(price) < activePrice(best) ? price : best));
}

export function productImageForBestPrice(product: Product) {
  const cheapest = cheapestAvailablePrice(product);
  return cheapest?.imageUrl || product.imageUrl;
}

export function averageLatestPrice(product: Product) {
  const prices = latestByStore(product.prices).filter(isConfirmedPrice);
  if (!prices.length) return 0;
  return Math.round((prices.reduce((sum, price) => sum + activePrice(price), 0) / prices.length) * 100) / 100;
}

export function storeCount(product: Product) {
  return latestByStore(product.prices).filter(isConfirmedPrice).length;
}

/** Точні збіги окремо від схожих товарів: схожі не беруть участі в мінімумі й середній ціні. */
export function splitMarketPrices(prices: Array<Price | MarketPrice>) {
  const exact: Array<Price | MarketPrice> = [];
  const similar: MarketPrice[] = [];
  for (const price of prices) {
    if ("matchType" in price && price.matchType === "similar") similar.push(price);
    else exact.push(price);
  }
  return { exact, similar };
}

export function formatPrice(value: number) {
  const fixed = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${fixed.replace(".", ",")} грн`;
}

export function formatDate(value: string | Date) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

export function daysSince(value: string | Date, now = new Date()) {
  return Math.max(0, Math.floor((+now - +new Date(value)) / 86400000));
}

/** Той самий поріг, що й PRICE_MAX_AGE_HOURS на сервері: старіша ціна вважається непідтвердженою. */
export const MAX_PRICE_AGE_HOURS = 72;

export function isStale(value: string | Date, now = new Date()) {
  return +now - +new Date(value) > MAX_PRICE_AGE_HOURS * 60 * 60 * 1000;
}

/** Ціна є в наявності й нещодавно підтверджена збором: лише така бере участь у розрахунках. */
export function isConfirmedPrice(price: Price) {
  return price.isAvailable && !isStale(checkedAt(price));
}

export function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function countLabel(count: number, one: string, few: string, many: string) {
  return `${count} ${plural(count, one, few, many)}`;
}

export function ageLabel(value: string | Date) {
  const days = daysSince(value);
  if (days === 0) return "сьогодні";
  if (days === 1) return "учора";
  return `${countLabel(days, "день", "дні", "днів")} тому`;
}

/** Найновіша дата збору серед усіх цін товарів. */
export function latestCollectedAt(products: Product[]) {
  let latest: string | null = null;
  for (const product of products) {
    for (const price of product.prices || []) {
      const seen = checkedAt(price);
      if (!latest || +new Date(seen) > +new Date(latest)) latest = seen;
    }
  }
  return latest;
}

export function storesWithPrices(products: Product[]) {
  const ids = new Set<string>();
  for (const product of products) {
    for (const price of product.prices || []) ids.add(price.storeId);
  }
  return ids.size;
}
