import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { longestGapMs, msUntilNext, parseTimes } from "./priceScheduler";

const HOUR = 60 * 60 * 1000;

describe("parseTimes", () => {
  it("sorts, de-duplicates and skips invalid entries", () => {
    assert.deepEqual(parseTimes("22:00, 06:00,14:00,bad,06:00,25:00"), [
      { hours: 6, minutes: 0 },
      { hours: 14, minutes: 0 },
      { hours: 22, minutes: 0 }
    ]);
  });
  it("defaults to 06:00", () => {
    assert.deepEqual(parseTimes(undefined), [{ hours: 6, minutes: 0 }]);
    assert.deepEqual(parseTimes("nonsense"), [{ hours: 6, minutes: 0 }]);
  });
});

describe("msUntilNext", () => {
  const times = parseTimes("06:00,14:00,22:00");
  it("waits for the next time today", () => {
    assert.equal(msUntilNext(times, new Date(2026, 10, 7, 7, 0)), 7 * HOUR);
  });
  it("wraps to tomorrow after the last time", () => {
    assert.equal(msUntilNext(times, new Date(2026, 10, 7, 23, 0)), 7 * HOUR);
  });
});

describe("longestGapMs", () => {
  it("is 24 h for one run a day and the largest gap for several", () => {
    assert.equal(longestGapMs(parseTimes("06:00")), 24 * HOUR);
    assert.equal(longestGapMs(parseTimes("06:00,14:00,22:00")), 8 * HOUR);
    assert.equal(longestGapMs(parseTimes("06:00,08:00")), 22 * HOUR);
  });
});
