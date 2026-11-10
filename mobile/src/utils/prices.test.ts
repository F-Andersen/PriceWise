import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Price, Product, Store } from "../types";
import { activePrice, checkedAt, dailyLowestPrices, hasActiveDiscount, isConfirmedPrice, isStale, latestByStore, minProductPrice, promoUntilLabel, regularPrice, storeCount } from "./prices";

const store = (id: string) => ({ id, name: id, city: "Київ" }) as Store;
const DAY = 24 * 60 * 60 * 1000;
const price = (overrides: Partial<Price>): Price => ({
  id: Math.random().toString(36),
  productId: "p1",
  storeId: "s1",
  price: 50,
  dateCollected: "2026-11-01T06:00:00.000Z",
  isAvailable: true,
  store: store("s1"),
  ...overrides
});

describe("dailyLowestPrices", () => {
  const row = (storeId: string, value: number, day: string) => price({ storeId, price: value, dateCollected: `2026-11-${day}T06:00:00.000Z` });

  it("does not mix stores into a zigzag: a store keeps its price until it changes", () => {
    const points = dailyLowestPrices([row("a", 40, "01"), row("b", 55, "02"), row("a", 42, "03")]);
    assert.deepEqual(points.map((point) => point.price), [40, 40, 42]);
  });

  it("keeps only the last dates", () => {
    const points = dailyLowestPrices([row("a", 40, "01"), row("a", 41, "02"), row("a", 42, "03")], 2);
    assert.deepEqual(points.map((point) => point.date), ["2026-11-02", "2026-11-03"]);
  });
});

describe("activePrice", () => {
  it("uses the regular price without a discount", () => {
    assert.equal(activePrice(price({ price: "50.00" })), 50);
  });
  it("uses the discount while the promotion runs", () => {
    const running = price({ price: 40, oldPrice: 50, discountPrice: 40, promoEndsAt: new Date(Date.now() + DAY).toISOString() });
    assert.equal(hasActiveDiscount(running), true);
    assert.equal(activePrice(running), 40);
  });
  it("falls back to the regular price after the promotion ended", () => {
    const ended = price({ price: 40, oldPrice: 50, discountPrice: 40, promoEndsAt: new Date(Date.now() - DAY).toISOString() });
    assert.equal(hasActiveDiscount(ended), false);
    assert.equal(activePrice(ended), 50);
  });
  it("struck-out price is the regular one, not the current price", () => {
    assert.equal(regularPrice(price({ price: 40, oldPrice: 50, discountPrice: 40 })), 50);
  });
});

describe("latestByStore", () => {
  it("keeps only the newest price per store", () => {
    const rows = [
      price({ storeId: "a", price: 10, dateCollected: "2026-11-01T00:00:00Z" }),
      price({ storeId: "a", price: 12, dateCollected: "2026-11-05T00:00:00Z" }),
      price({ storeId: "b", price: 20, dateCollected: "2026-11-02T00:00:00Z" })
    ];
    const latest = latestByStore(rows);
    assert.equal(latest.length, 2);
    assert.equal(latest.find((row) => row.storeId === "a")?.price, 12);
  });
});

describe("checkedAt", () => {
  it("shows when the price was last confirmed, not when it first appeared", () => {
    assert.equal(checkedAt({ dateCollected: "2026-11-01T06:00:00Z", lastSeenAt: "2026-11-07T06:00:00Z" }), "2026-11-07T06:00:00Z");
    assert.equal(checkedAt({ dateCollected: "2026-11-01T06:00:00Z" }), "2026-11-01T06:00:00Z");
  });
});

describe("price freshness", () => {
  const HOUR = 60 * 60 * 1000;
  const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

  it("is stale only after 72 hours", () => {
    const now = new Date("2026-11-09T12:00:00Z");
    assert.equal(isStale(new Date(now.getTime() - 72 * HOUR), now), false);
    assert.equal(isStale(new Date(now.getTime() - 72 * HOUR - 1), now), true);
  });
  it("confirms a price by its last check, not by when it first appeared", () => {
    assert.equal(isConfirmedPrice(price({ dateCollected: ago(500), lastSeenAt: ago(1) })), true);
    assert.equal(isConfirmedPrice(price({ dateCollected: ago(500), lastSeenAt: ago(100) })), false);
    assert.equal(isConfirmedPrice(price({ lastSeenAt: ago(1), isAvailable: false })), false);
  });
  it("leaves unconfirmed prices out of the lowest price and store count", () => {
    const product = {
      prices: [
        price({ storeId: "old", price: 1, dateCollected: ago(200), lastSeenAt: ago(100) }),
        price({ storeId: "fresh", price: 50, dateCollected: ago(2), lastSeenAt: ago(1) })
      ]
    } as unknown as Product;
    assert.equal(minProductPrice(product), 50);
    assert.equal(storeCount(product), 1);
  });
});

describe("promoUntilLabel", () => {
  it("formats the last day of a promotion", () => {
    assert.equal(promoUntilLabel(new Date(2026, 10, 10, 23, 59)), "до 10.11");
  });
});
