import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseQuantity, productTitle, unitPriceLabel, volumeLabel } from "./productText";

describe("parseQuantity", () => {
  it("reads the same pack sizes as the server", () => {
    assert.deepEqual(parseQuantity("180 г"), { amount: 0.18, unit: "кг" });
    assert.deepEqual(parseQuantity("1.5 л"), { amount: 1.5, unit: "л" });
    assert.deepEqual(parseQuantity("810 мл"), { amount: 0.81, unit: "л" });
    assert.deepEqual(parseQuantity("за 1 кг"), { amount: 1, unit: "кг" });
    assert.deepEqual(parseQuantity("10 шт"), { amount: 10, unit: "шт" });
  });

  it("returns null for an unknown size", () => {
    assert.equal(parseQuantity("упаковка"), null);
    assert.equal(parseQuantity("0 г"), null);
    assert.equal(parseQuantity(null), null);
  });
});

describe("unitPriceLabel", () => {
  it("converts a pack price to a price per unit", () => {
    assert.equal(unitPriceLabel(51, "200 г"), "255 грн/кг");
    assert.equal(unitPriceLabel(30, "1.5 л"), "20 грн/л");
  });

  it("skips single-unit packs and unknown sizes", () => {
    assert.equal(unitPriceLabel(80, "1 кг"), null);
    assert.equal(unitPriceLabel(80, "за 1 кг"), null);
    assert.equal(unitPriceLabel(80, "1 шт"), null);
    assert.equal(unitPriceLabel(80, "пачка"), null);
  });
});

describe("volumeLabel", () => {
  it("uses a decimal comma", () => {
    assert.equal(volumeLabel("1.5 л"), "1,5 л");
    assert.equal(volumeLabel(null), "");
  });
});

describe("productTitle", () => {
  it("splits the brand from the name and drops the pack size", () => {
    assert.deepEqual(productTitle({ name: "Йогурт Дольче вишня 2,5% 290г", brand: "Дольче" }), { brand: "Дольче", name: "Йогурт вишня 2,5%" });
    assert.deepEqual(productTitle({ name: "Олія оливкова Metro Chef Extra Virgin 1л", brand: "Metro Chef" }), { brand: "Metro Chef", name: "Олія оливкова Extra Virgin" });
  });

  it("does not trust a brand that is really part of the name", () => {
    assert.deepEqual(productTitle({ name: "Ковбаса Бащинський варена 500г", brand: "Ковбаса" }), { brand: null, name: "Ковбаса Бащинський варена" });
    assert.deepEqual(productTitle({ name: "Напій газований Coca-Cola 1,75л", brand: "газований" }), { brand: null, name: "Напій газований Coca-Cola" });
    assert.deepEqual(productTitle({ name: "Хліб білий", brand: "без тм" }), { brand: null, name: "Хліб білий" });
  });

  it("keeps the name when the brand is missing from it", () => {
    assert.deepEqual(productTitle({ name: "Хліб білий", brand: "Auchan" }), { brand: null, name: "Хліб білий" });
    assert.deepEqual(productTitle({ name: "Хліб білий", brand: null }), { brand: null, name: "Хліб білий" });
  });

  it("keeps fat percentages at the end of a name", () => {
    assert.deepEqual(productTitle({ name: "Молоко Галичина 2.5%", brand: "Галичина" }), { brand: "Галичина", name: "Молоко 2.5%" });
  });
});
