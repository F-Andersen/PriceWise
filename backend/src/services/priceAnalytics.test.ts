import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { analyzeProduct, analyzeStoreHistory, type HistoryRow } from "./priceAnalytics";

const now = new Date("2026-11-10T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const store = { id: "s", name: "Novus" };
const row = (value: number, fromDaysAgo: number, toDaysAgo: number, extra: Partial<HistoryRow> = {}): HistoryRow => ({
  price: new Prisma.Decimal(value),
  oldPrice: null,
  discountPrice: null,
  promoEndsAt: null,
  isAvailable: true,
  dateCollected: ago(fromDaysAgo),
  lastSeenAt: ago(toDaysAgo),
  ...extra
});
const promo = (value: number, old: number, fromDaysAgo: number, toDaysAgo: number) =>
  row(value, fromDaysAgo, toDaysAgo, { oldPrice: new Prisma.Decimal(old), discountPrice: new Prisma.Decimal(value) });

describe("analyzeStoreHistory", () => {
  it("weights each price by how long it lasted", () => {
    // 100 for 20 days, then 70 for the last 10 days: (2000 + 700) / 30 = 90
    const result = analyzeStoreHistory(store, [row(100, 30, 11), row(70, 10, 0)], now)!;
    assert.equal(result.average, 90);
    assert.equal(result.min, 70);
    assert.equal(result.max, 100);
    assert.equal(result.changes, 1);
    assert.equal(result.observedDays, 30);
  });
  it("calls a price well below its own history good", () => {
    const result = analyzeStoreHistory(store, [row(100, 30, 11), row(70, 10, 0)], now)!;
    assert.equal(result.signal, "good");
    assert.ok(result.cheaperThanShare > 0.6);
  });
  it("calls a price above its history high", () => {
    assert.equal(analyzeStoreHistory(store, [row(70, 30, 11), row(100, 10, 0)], now)!.signal, "high");
  });
  it("calls a stable price normal", () => {
    assert.equal(analyzeStoreHistory(store, [row(100, 30, 0)], now)!.signal, "normal");
  });
  it("does not judge with under two weeks of data", () => {
    const result = analyzeStoreHistory(store, [row(100, 13, 7), row(50, 6, 0)], now)!;
    assert.equal(result.observedDays, 13);
    assert.equal(result.signal, "insufficient");
  });
  it("measures the share of time on promotion", () => {
    assert.equal(analyzeStoreHistory(store, [row(100, 30, 16), promo(80, 100, 15, 0)], now)!.promoShare, 0.5);
  });
  it("uses only the last 90 days", () => {
    const result = analyzeStoreHistory(store, [row(500, 200, 91), row(100, 90, 0)], now)!;
    assert.equal(result.max, 100);
  });
  it("leaves out time when the product was unavailable", () => {
    const result = analyzeStoreHistory(store, [row(100, 30, 21), row(1, 20, 11, { isAvailable: false }), row(100, 10, 0)], now)!;
    assert.equal(result.min, 100);
    assert.equal(result.observedDays, 20);
  });
  it("returns nothing for an unavailable or expired latest price", () => {
    assert.equal(analyzeStoreHistory(store, [row(100, 30, 0, { isAvailable: false })], now), null);
    assert.equal(analyzeStoreHistory(store, [row(100, 30, 10)], now), null);
  });
});

describe("analyzeProduct", () => {
  const other = { id: "o", name: "Ашан" };
  it("describes the store with the lowest confirmed price and explains why", () => {
    const result = analyzeProduct([{ store: other, rows: [row(120, 30, 0)] }, { store, rows: [row(100, 30, 11), row(70, 10, 0)] }], now);
    assert.equal(result.reference?.store.name, "Novus");
    assert.equal(result.signal, "good");
    assert.match(result.reasons[0], /нижча за середню/);
    assert.ok(result.reasons.some((reason) => reason.includes("90,00 грн")));
  });
  it("says plainly when there is too little history", () => {
    const result = analyzeProduct([{ store, rows: [row(100, 5, 0)] }], now);
    assert.equal(result.signal, "insufficient");
    assert.match(result.reasons[0], /спостерігаємо 5 дн/);
  });
  it("handles a product with no confirmed price", () => {
    const result = analyzeProduct([{ store, rows: [row(100, 30, 20)] }], now);
    assert.equal(result.reference, null);
    assert.equal(result.signal, "insufficient");
  });
});
