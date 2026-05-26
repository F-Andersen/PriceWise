import { Price, Product } from "../types";

export function numberPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

export function activePrice(price: Price) {
  return numberPrice(price.discountPrice ?? price.price);
}

export function latestByStore(prices: Price[] = []) {
  const map = new Map<string, Price>();
  for (const price of [...prices].sort((a, b) => +new Date(b.dateCollected) - +new Date(a.dateCollected))) {
    if (!map.has(price.storeId)) map.set(price.storeId, price);
  }
  return Array.from(map.values());
}

export function minProductPrice(product: Product) {
  const available = latestByStore(product.prices).filter((price) => price.isAvailable);
  if (!available.length) return null;
  return Math.min(...available.map(activePrice));
}

export function averageLatestPrice(product: Product) {
  const prices = latestByStore(product.prices).filter((price) => price.isAvailable);
  if (!prices.length) return 0;
  return Math.round((prices.reduce((sum, price) => sum + activePrice(price), 0) / prices.length) * 100) / 100;
}
