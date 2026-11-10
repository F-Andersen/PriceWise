import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunk } from "./chunk";

describe("chunk", () => {
  it("keeps every item in order and respects the size", () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it("returns nothing for an empty list", () => {
    assert.deepEqual(chunk([], 10), []);
  });

  it("rejects a size that would never finish", () => {
    assert.throws(() => chunk([1], 0), RangeError);
  });
});
