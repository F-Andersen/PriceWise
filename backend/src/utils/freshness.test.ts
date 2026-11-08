import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPriceFresh, maxPriceAgeMs } from "./freshness";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-11-09T12:00:00Z");

describe("maxPriceAgeMs", () => {
  it("defaults to 72 hours and accepts an override", () => {
    assert.equal(maxPriceAgeMs(""), 72 * HOUR);
    assert.equal(maxPriceAgeMs("24"), 24 * HOUR);
  });
  it("ignores invalid values", () => {
    assert.equal(maxPriceAgeMs("abc"), 72 * HOUR);
    assert.equal(maxPriceAgeMs("0"), 72 * HOUR);
    assert.equal(maxPriceAgeMs("-5"), 72 * HOUR);
  });
});

describe("isPriceFresh", () => {
  it("is fresh up to and including the limit, stale after it", () => {
    assert.equal(isPriceFresh(new Date(now.getTime() - 72 * HOUR), now, 72 * HOUR), true);
    assert.equal(isPriceFresh(new Date(now.getTime() - 72 * HOUR - 1), now, 72 * HOUR), false);
  });
});
