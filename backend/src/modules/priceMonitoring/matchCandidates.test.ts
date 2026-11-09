import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCandidatePairs, nameTokens, type MatchProduct } from "./matchCandidates";

const product = (id: string, name: string, stores: string[], volume = "250 г", brand = "Lavazza"): MatchProduct => ({ id, name, brand, volume, storeIds: stores });
const reasons = (products: MatchProduct[]) => findCandidatePairs(products).map((pair) => [pair.productAId, pair.productBId, pair.reason]);

describe("nameTokens", () => {
  it("ignores order, punctuation, pack size and comma decimals", () => {
    assert.deepEqual(nameTokens("Масло «Селянське», 82,5% 180г"), nameTokens("селянське МАСЛО 82.5% 180 г"));
  });
  it("keeps fat percentage as a meaningful word", () => {
    assert.ok(nameTokens("Молоко 2,5% 900г").includes("2.5%"));
  });
});

describe("findCandidatePairs", () => {
  it("pairs the same name and pack from different stores", () => {
    assert.deepEqual(reasons([product("a", "Кава мелена Lavazza Qualita Rossa 250г", ["x"]), product("b", "Кава Lavazza мелена Qualita Rossa", ["y"])]), [["a", "b", "same_name"]]);
  });
  it("never pairs products sold by the same store", () => {
    assert.deepEqual(reasons([product("a", "Вирізка свиняча", ["x"], "за 1 кг", ""), product("b", "Вирізка свиняча", ["x", "y"], "за 1 кг", "")]), []);
  });
  it("pairs only the stores that do not overlap in a group", () => {
    const pairs = reasons([
      product("a", "Вирізка свиняча", ["x"], "за 1 кг", ""),
      product("b", "Вирізка свиняча", ["x"], "за 1 кг", ""),
      product("c", "Вирізка свиняча", ["y"], "за 1 кг", "")
    ]);
    assert.deepEqual(pairs, [["a", "c", "same_name"], ["b", "c", "same_name"]]);
  });
  it("does not pair different pack sizes", () => {
    assert.deepEqual(reasons([product("a", "Кава Lavazza Rossa", ["x"], "250 г"), product("b", "Кава Lavazza Rossa", ["y"], "500 г")]), []);
  });
  it("finds nearly identical names of one brand", () => {
    const [pair] = findCandidatePairs([product("a", "Кава мелена Lavazza Qualita Rossa натуральна", ["x"]), product("b", "Кава мелена Lavazza Qualita Rossa смажена натуральна", ["y"])]);
    assert.equal(pair.reason, "similar_name");
    assert.ok(pair.score >= 75 && pair.score < 95);
  });
  it("does not treat a different flavour or fat as nearly the same", () => {
    assert.deepEqual(reasons([product("a", "Йогурт Дольче ніжний домашній густий вишня", ["x"], "290 г", "Дольче"), product("b", "Йогурт Дольче ніжний домашній густий персик", ["y"], "290 г", "Дольче")]), []);
    assert.deepEqual(reasons([product("a", "Молоко Селянське домашнє свіже 2,5%", ["x"], "900 г", "Селянське"), product("b", "Молоко Селянське домашнє свіже 3,2%", ["y"], "900 г", "Селянське")]), []);
  });
  it("does not treat a real variant as nearly the same", () => {
    const pairsFor = (a: string, b: string) => reasons([product("a", a, ["x"], "900 г", "Ферма"), product("b", b, ["y"], "900 г", "Ферма")]);
    assert.deepEqual(pairsFor("Молоко Ферма ультрапастеризоване 2,5%", "Молоко Ферма безлактозне ультрапастеризоване 2,5%"), []);
    assert.deepEqual(pairsFor("Шийка Ферма сирокопчена вищий сорт", "Шийка Ферма сирокопчена вищий сорт нарізана"), []);
    assert.deepEqual(pairsFor("Сардельки Ферма Мʼясні варені перший сорт", "Сардельки Ферма Мʼясні з сиром варені перший сорт"), []);
  });
  it("treats 'без тм' as no brand", () => {
    assert.deepEqual(reasons([product("a", "Огірок дуже свіжий гладкий довгий", ["x"], "за 1 кг", "без тм"), product("b", "Огірок дуже свіжий гладкий короткий", ["y"], "за 1 кг", "Без бренду")]), []);
  });
  it("does not compare similar names across brands", () => {
    assert.deepEqual(reasons([product("a", "Кава мелена натуральна смажена міцна", ["x"], "250 г", "A"), product("b", "Кава мелена натуральна смажена ніжна", ["y"], "250 г", "B")]), []);
  });
  it("returns each pair once, best match first", () => {
    const pairs = findCandidatePairs([product("a", "Кава Lavazza Rossa", ["x"]), product("b", "Rossa Lavazza кава", ["y"])]);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].score, 95);
  });
});
