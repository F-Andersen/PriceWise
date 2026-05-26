import { Prisma } from "@prisma/client";

export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

export function activePrice(price: {
  price: Prisma.Decimal;
  discountPrice: Prisma.Decimal | null;
}): number {
  return toNumber(price.discountPrice ?? price.price);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
