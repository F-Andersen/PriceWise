import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { compareBaskets, type LatestPriceInput } from "./basketComparison";

const now = new Date("2026-11-07T12:00:00Z");
const store = (id: string) => ({ id, name: id, city: "Київ" });
const item = (productId: string, quantity = 1) => ({ productId, productName: `Товар ${productId}`, quantity });
const price = (productId: string, storeId: string, value: number, extra: Partial<LatestPriceInput> = {}): LatestPriceInput => ({
  productId,
  storeId,
  price: new Prisma.Decimal(value),
  oldPrice: null,
  discountPrice: null,
  promoEndsAt: null,
  isAvailable: true,
  lastSeenAt: new Date("2026-11-07T06:00:00Z"),
  ...extra
});

describe("compareBaskets", () => {
  it("never ranks a partial basket above complete ones (the old METRO bug)", () => {
    // METRO has 1 of 3 items and the smallest sum; Ашан and Novus have all three.
    const result = compareBaskets({
      now,
      items: [item("a"), item("b"), item("c")],
      stores: [store("METRO"), store("Ашан"), store("Novus")],
      latestPrices: [
        price("a", "METRO", 29.9),
        price("a", "Ашан", 30), price("b", "Ашан", 100), price("c", "Ашан", 146.6),
        price("a", "Novus", 32), price("b", "Novus", 110), price("c", "Novus", 150)
      ]
    });
    assert.deepEqual(result.verdict, { kind: "cheapest", storeIds: ["Ашан"], total: 276.6, spread: 15.4, completeCount: 2 });
    const byName = Object.fromEntries(result.stores.map((basket) => [basket.store.name, basket]));
    assert.equal(byName["Ашан"].isBest, true);
    assert.equal(byName["Novus"].difference, 15.4);
    assert.equal(byName["METRO"].status, "partial");
    assert.equal(byName["METRO"].isBest, false);
    assert.equal(byName["METRO"].difference, null);
    assert.deepEqual(result.stores.map((basket) => basket.store.name), ["Ашан", "Novus", "METRO"]);
  });

  it("does not call a single complete basket the cheapest", () => {
    const result = compareBaskets({
      now,
      items: [item("a"), item("b")],
      stores: [store("Ашан"), store("METRO")],
      latestPrices: [price("a", "Ашан", 10), price("b", "Ашан", 20), price("a", "METRO", 5)]
    });
    assert.deepEqual(result.verdict, { kind: "single_complete", storeId: "Ашан", total: 30, partialCount: 1 });
    assert.equal(result.stores[0].isBest, false);
    assert.equal(result.stores[0].difference, null);
  });

  it("says when no store has the whole basket", () => {
    const result = compareBaskets({
      now,
      items: [item("a"), item("b")],
      stores: [store("x"), store("y")],
      latestPrices: [price("a", "x", 10), price("b", "y", 20)]
    });
    assert.deepEqual(result.verdict, { kind: "none_complete", partialCount: 2 });
    assert.ok(result.stores.every((basket) => !basket.isBest && basket.difference === null));
  });

  it("puts stores without any price last as no_data, with total 0 not ranked", () => {
    const result = compareBaskets({
      now,
      items: [item("a")],
      stores: [store("empty"), store("x"), store("y")],
      latestPrices: [price("a", "x", 10), price("a", "y", 12)]
    });
    const empty = result.stores[result.stores.length - 1];
    assert.equal(empty.store.name, "empty");
    assert.equal(empty.status, "no_data");
    assert.equal(empty.isBest, false);
    assert.equal(empty.difference, null);
  });

  it("explains why an item is missing", () => {
    const result = compareBaskets({
      now,
      items: [item("a"), item("b")],
      stores: [store("x")],
      latestPrices: [price("a", "x", 10, { isAvailable: false })]
    });
    assert.deepEqual(
      result.stores[0].missing.map((line) => [line.productId, line.reason]),
      [["a", "unavailable"], ["b", "no_price"]]
    );
  });

  it("multiplies by quantity and uses the regular price after a promotion ended", () => {
    const result = compareBaskets({
      now,
      items: [item("a", 3)],
      stores: [store("x"), store("y")],
      latestPrices: [
        price("a", "x", 40, { oldPrice: new Prisma.Decimal(50), discountPrice: new Prisma.Decimal(40), promoEndsAt: new Date("2026-11-06T21:59:59Z") }),
        price("a", "y", 45, { oldPrice: new Prisma.Decimal(55), discountPrice: new Prisma.Decimal(45), promoEndsAt: new Date("2026-11-10T21:59:59Z") })
      ]
    });
    const byName = Object.fromEntries(result.stores.map((basket) => [basket.store.name, basket]));
    assert.equal(byName.x.totalPrice, 150); // expired: 3 × 50
    assert.equal(byName.x.items[0].hasDiscount, false);
    assert.equal(byName.y.totalPrice, 135); // running: 3 × 45
    assert.equal(byName.y.items[0].hasDiscount, true);
    assert.equal(byName.y.isBest, true);
  });

  it("marks every store tied for the lowest total", () => {
    const result = compareBaskets({
      now,
      items: [item("a")],
      stores: [store("x"), store("y"), store("z")],
      latestPrices: [price("a", "x", 10), price("a", "y", 10), price("a", "z", 11)]
    });
    assert.equal(result.verdict.kind, "cheapest");
    assert.deepEqual(result.verdict.kind === "cheapest" ? result.verdict.storeIds.sort() : [], ["x", "y"]);
  });

  it("reports the oldest check time among the prices used", () => {
    const result = compareBaskets({
      now,
      items: [item("a"), item("b")],
      stores: [store("x")],
      latestPrices: [
        price("a", "x", 1, { lastSeenAt: new Date("2026-11-07T06:00:00Z") }),
        price("b", "x", 1, { lastSeenAt: new Date("2026-11-01T06:00:00Z") })
      ]
    });
    assert.equal(result.stores[0].checkedAt?.toISOString(), "2026-11-01T06:00:00.000Z");
  });

  it("handles an empty basket", () => {
    const result = compareBaskets({ now, items: [], stores: [store("x")], latestPrices: [] });
    assert.deepEqual(result.verdict, { kind: "empty" });
  });
});
