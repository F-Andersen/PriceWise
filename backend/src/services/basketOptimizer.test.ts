import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import type { LatestPriceInput } from "./basketComparison";
import { optimizeBasket } from "./basketOptimizer";

const now = new Date("2026-11-10T12:00:00Z");
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
  lastSeenAt: new Date("2026-11-10T04:00:00Z"),
  ...extra
});
const stores = [store("A"), store("B"), store("C")];

describe("optimizeBasket", () => {
  const items = [item("milk"), item("bread")];
  const prices = [price("milk", "A", 40), price("bread", "A", 40), price("milk", "B", 50), price("bread", "B", 20), price("milk", "C", 60), price("bread", "C", 60)];

  it("finds the cheapest store and the cheapest split", () => {
    const { plans } = optimizeBasket({ now, items, stores, latestPrices: prices });
    assert.deepEqual(plans.map((plan) => [plan.storeCount, plan.total]), [[1, 70], [2, 60]]);
    assert.deepEqual(plans[0].stops.map((stop) => stop.store.name), ["B"]);
    assert.equal(plans[1].savingVsOneStore, 10);
    assert.deepEqual(plans[1].stops.map((stop) => [stop.store.name, stop.total]), [["A", 40], ["B", 20]]);
  });

  it("recommends splitting only when the saving beats the cost of another store", () => {
    const free = optimizeBasket({ now, items, stores, latestPrices: prices, extraStoreCost: 0 });
    assert.equal(free.plans.find((plan) => plan.isRecommended)?.storeCount, 2);
    const costly = optimizeBasket({ now, items, stores, latestPrices: prices, extraStoreCost: 30 });
    assert.equal(costly.plans.find((plan) => plan.isRecommended)?.storeCount, 1);
    assert.match(costly.summary ?? "", /лише 10,00 грн/);
  });

  it("does not list a third store that buys nothing", () => {
    const { plans } = optimizeBasket({ now, items, stores, latestPrices: prices });
    assert.ok(!plans.some((plan) => plan.storeCount === 3));
  });

  it("prefers covering more items over a lower total", () => {
    const { plans } = optimizeBasket({
      now,
      items,
      stores: [store("A"), store("B")],
      latestPrices: [price("milk", "A", 10), price("milk", "B", 40), price("bread", "B", 40)]
    });
    assert.equal(plans[0].stops[0].store.name, "B", "B has both items, A only the cheap one");
    assert.equal(plans[0].coveredCount, 2);
  });

  it("does not claim a saving against a store with fewer items", () => {
    const { plans } = optimizeBasket({
      now,
      items,
      stores: [store("A"), store("B")],
      latestPrices: [price("milk", "A", 10), price("bread", "B", 20)]
    });
    assert.equal(plans[0].coveredCount, 1);
    assert.equal(plans[1].coveredCount, 2);
    assert.equal(plans[1].savingVsOneStore, null);
    assert.equal(plans[1].isRecommended, true, "the plan that buys everything wins");
  });

  it("reports what no combination can buy", () => {
    const result = optimizeBasket({ now, items, stores: [store("A")], latestPrices: [price("milk", "A", 10)] });
    assert.deepEqual(result.plans[0].missing.map((line) => line.productId), ["bread"]);
    assert.match(result.summary ?? "", /1 із 2/);
  });

  it("multiplies by quantity", () => {
    const { plans } = optimizeBasket({ now, items: [item("milk", 3)], stores: [store("A")], latestPrices: [price("milk", "A", 10.5)] });
    assert.equal(plans[0].total, 31.5);
  });

  it("ignores expired, unavailable and ended-promotion prices correctly", () => {
    const { plans } = optimizeBasket({
      now,
      items: [item("milk")],
      stores: [store("old"), store("gone"), store("promo"), store("ok")],
      latestPrices: [
        price("milk", "old", 1, { lastSeenAt: new Date("2026-11-01T00:00:00Z") }),
        price("milk", "gone", 2, { isAvailable: false }),
        price("milk", "promo", 5, { oldPrice: new Prisma.Decimal(50), discountPrice: new Prisma.Decimal(5), promoEndsAt: new Date("2026-11-09T21:59:59Z") }),
        price("milk", "ok", 30)
      ]
    });
    assert.deepEqual(plans[0].stops.map((stop) => [stop.store.name, stop.total]), [["ok", 30]]);
  });

  it("handles an empty basket and a basket without prices", () => {
    assert.deepEqual(optimizeBasket({ now, items: [], stores, latestPrices: [] }).plans, []);
    const none = optimizeBasket({ now, items, stores, latestPrices: [] });
    assert.deepEqual(none.plans, []);
    assert.match(none.summary ?? "", /немає підтверджених цін/);
  });

  it("never recommends more than one plan", () => {
    const { plans } = optimizeBasket({ now, items, stores, latestPrices: prices, extraStoreCost: 5 });
    assert.equal(plans.filter((plan) => plan.isRecommended).length, 1);
  });
});
