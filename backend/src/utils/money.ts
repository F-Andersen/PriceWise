import { Prisma } from "@prisma/client";

export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

type PriceLike = {
  price: Prisma.Decimal;
  oldPrice?: Prisma.Decimal | null;
  discountPrice: Prisma.Decimal | null;
  promoEndsAt?: Date | null;
};

/** A discount counts only if the store hasn't told us it already ended. */
export function hasActiveDiscount(price: PriceLike, now = new Date()): boolean {
  if (!price.discountPrice) return false;
  return !price.promoEndsAt || price.promoEndsAt >= now;
}

/**
 * The price a shopper pays now. After a known promotion end date we fall back to
 * the regular price until the next collection brings a fresh one.
 */
export function activePrice(price: PriceLike, now = new Date()): number {
  if (hasActiveDiscount(price, now)) return toNumber(price.discountPrice);
  if (price.discountPrice) return toNumber(price.oldPrice ?? price.price);
  return toNumber(price.price);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
