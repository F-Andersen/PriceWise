import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyBarcode, hasValidCheckDigit, toGtin14 } from "./gtin";

describe("toGtin14", () => {
  it("pads 13-digit EAN to 14 digits", () => {
    assert.equal(toGtin14("4820017000024"), "04820017000024");
  });
  it("rejects non-numeric and too short values", () => {
    assert.equal(toGtin14("abc"), null);
    assert.equal(toGtin14("1234"), null);
    assert.equal(toGtin14("tavriav.zakaz.ua:02517618004026"), null);
  });
});

describe("hasValidCheckDigit", () => {
  it("accepts real product barcodes", () => {
    assert.equal(hasValidCheckDigit("04820017000024"), true); // Моршинська
    assert.equal(hasValidCheckDigit("05449000130389"), true); // Coca-Cola
  });
  it("rejects a wrong check digit", () => {
    assert.equal(hasValidCheckDigit("04820017000025"), false);
  });
});

describe("classifyBarcode", () => {
  it("treats real GTINs as global, in either 13- or 14-digit form", () => {
    assert.deepEqual(classifyBarcode("4820017000024"), { kind: "global", gtin14: "04820017000024" });
    assert.equal(classifyBarcode("04820017000024").kind, "global");
  });
  it("treats in-store weighed codes (prefix 20–29) as store-internal", () => {
    assert.equal(classifyBarcode("02211756000000").kind, "store-internal");
  });
  it("treats short zero-padded store codes as store-internal, not global", () => {
    // МегаМаркет weighed goods: "123303" padded. Matching these across stores was a real bug.
    assert.notEqual(classifyBarcode("00000000123303").kind, "global");
  });
  it("marks invalid codes as invalid", () => {
    assert.equal(classifyBarcode("02865888000000").kind, "invalid");
    assert.equal(classifyBarcode("fresh:капуста:kg").kind, "invalid");
  });
});
