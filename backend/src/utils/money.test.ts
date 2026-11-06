import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { activePrice, hasActiveDiscount, roundMoney } from "./money";

const D = (value: number) => new Prisma.Decimal(value);
const now = new Date("2026-11-07T12:00:00Z");
const tomorrow = new Date("2026-11-08T12:00:00Z");
const yesterday = new Date("2026-11-06T12:00:00Z");

describe("activePrice", () => {
  it("uses the regular price when there is no discount", () => {
    assert.equal(activePrice({ price: D(50), oldPrice: null, discountPrice: null }, now), 50);
  });
  it("uses the discount while the promotion runs or has no end date", () => {
    assert.equal(activePrice({ price: D(40), oldPrice: D(50), discountPrice: D(40), promoEndsAt: tomorrow }, now), 40);
    assert.equal(activePrice({ price: D(40), oldPrice: D(50), discountPrice: D(40), promoEndsAt: null }, now), 40);
  });
  it("falls back to the regular price after the promotion ended", () => {
    assert.equal(activePrice({ price: D(40), oldPrice: D(50), discountPrice: D(40), promoEndsAt: yesterday }, now), 50);
  });
});

describe("hasActiveDiscount", () => {
  it("is false without a discount and after the end date", () => {
    assert.equal(hasActiveDiscount({ price: D(50), discountPrice: null }, now), false);
    assert.equal(hasActiveDiscount({ price: D(40), discountPrice: D(40), promoEndsAt: yesterday }, now), false);
  });
});

describe("roundMoney", () => {
  it("rounds to kopecks", () => {
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
    assert.equal(roundMoney(29.705), 29.71);
  });
});
