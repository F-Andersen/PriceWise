import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectedStoresWhere, selectedStoresWhere } from "../modules/priceMonitoring/zakazStores";
import { parseExcludedStores } from "./storeFilter";

describe("parseExcludedStores", () => {
  it("reads a comma-separated list and removes duplicates", () => {
    assert.deepEqual(parseExcludedStores("abc, def,abc"), ["abc", "def"]);
  });
  it("returns nothing for a missing or non-string value", () => {
    assert.deepEqual(parseExcludedStores(undefined), []);
    assert.deepEqual(parseExcludedStores(["abc"]), []);
    assert.deepEqual(parseExcludedStores(""), []);
  });
  it("drops malformed ids", () => {
    assert.deepEqual(parseExcludedStores("good,bad id,'; drop table,also-good_1"), ["good", "also-good_1"]);
  });
  it("limits how many ids it accepts", () => {
    assert.equal(parseExcludedStores(Array.from({ length: 80 }, (_, i) => `s${i}`).join(",")).length, 50);
  });
});

describe("selectedStoresWhere", () => {
  it("is every collected store when nothing is excluded", () => {
    assert.equal(selectedStoresWhere([]), collectedStoresWhere);
  });
  it("keeps the collected-store limit and leaves out the excluded ones", () => {
    assert.deepEqual(selectedStoresWhere(["a", "b"]), { ...collectedStoresWhere, id: { notIn: ["a", "b"] } });
  });
});
