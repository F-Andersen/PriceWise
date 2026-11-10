import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CandidateProduct, chooseProduct, IngredientRule, ingredientFit, isRecipeComplete, matchesIngredient, packSize, parseServings, scaleAmount } from "./recipePlanning";

const cucumber: IngredientRule = { amount: 250, unit: "г", categories: ["Овочі"], includeTerms: ["огірок"], excludeTerms: ["маринов"] };

function product(overrides: Partial<CandidateProduct>): CandidateProduct {
  return { id: "a", name: "Огірок", category: "Овочі", volume: "за 1 кг", lowestPrice: 80, storeCount: 1, ...overrides };
}

describe("matchesIngredient", () => {
  it("accepts a name that starts with the term", () => {
    assert.equal(matchesIngredient(cucumber, product({ name: "Огірок довгоплідний Україна" })), true);
  });

  it("rejects excluded words, other categories and a term in the middle of the name", () => {
    assert.equal(matchesIngredient(cucumber, product({ name: "Огірок маринований 500г" })), false);
    assert.equal(matchesIngredient(cucumber, product({ category: "Консервація" })), false);
    assert.equal(matchesIngredient(cucumber, product({ name: "Салат огірок і кріп" })), false);
  });
});

describe("packSize", () => {
  it("takes the piece count from the name when the volume says 1 шт", () => {
    assert.deepEqual(packSize({ name: "Яйця курячі С1 10шт", category: "x", volume: "1 шт" }), { amount: 10, unit: "шт" });
  });

  it("keeps a real single piece and weight packs", () => {
    assert.deepEqual(packSize({ name: "Авокадо Хасс", category: "x", volume: "1 шт" }), { amount: 1, unit: "шт" });
    assert.deepEqual(packSize({ name: "Крупа 100г х 4шт", category: "x", volume: "400 г" }), { amount: 0.4, unit: "кг" });
  });
});

describe("scaleAmount", () => {
  it("rounds pieces up and grams to 5", () => {
    assert.equal(scaleAmount(1, "шт", 1.5), 2);
    assert.equal(scaleAmount(30, "г", 0.5), 15);
    assert.equal(scaleAmount(25, "г", 1.5), 40);
  });
});

describe("ingredientFit", () => {
  const milk = { name: "Молоко 2.5%", category: "x", volume: "900 г" };

  it("splits the dish share from the packs to buy", () => {
    const fit = ingredientFit({ amount: 300, unit: "мл" }, milk);
    assert.equal(fit?.packs, 1);
    assert.ok(Math.abs((fit?.share ?? 0) - 1 / 3) < 1e-9);
  });

  it("buys a second pack only when one is not enough", () => {
    assert.equal(ingredientFit({ amount: 900, unit: "мл" }, milk)?.packs, 1);
    assert.equal(ingredientFit({ amount: 900, unit: "мл" }, milk, 2)?.packs, 2);
  });

  it("counts eggs against the pack from the name", () => {
    const fit = ingredientFit({ amount: 4, unit: "шт" }, { name: "Яйця 10шт", category: "x", volume: "1 шт" });
    assert.deepEqual(fit, { amount: 4, share: 0.4, packs: 1 });
  });

  it("refuses to compare pieces with weight", () => {
    assert.equal(ingredientFit({ amount: 1, unit: "шт" }, { name: "Авокадо", category: "x", volume: "за 1 кг" }), null);
  });
});

describe("chooseProduct", () => {
  it("prefers the product sold in more chains, then the cheaper purchase", () => {
    const options = [product({ id: "one", storeCount: 1, lowestPrice: 10 }), product({ id: "cheap", storeCount: 3, lowestPrice: 60 }), product({ id: "dear", storeCount: 3, lowestPrice: 90 })];
    assert.equal(chooseProduct(cucumber, options)?.id, "cheap");
  });

  it("ignores unpriced products and oversized packs", () => {
    const options = [product({ id: "noprice", lowestPrice: null, storeCount: 5 }), product({ id: "sack", volume: "10 кг", storeCount: 5 })];
    assert.equal(chooseProduct(cucumber, options), null);
  });

  it("counts the whole purchase, not the price of one pack", () => {
    const eggs: IngredientRule = { amount: 4, unit: "шт", categories: [], includeTerms: ["яйц"], excludeTerms: [] };
    const options = [product({ id: "single", name: "Яйце 1шт", volume: "1 шт", lowestPrice: 8 }), product({ id: "ten", name: "Яйця 10шт", volume: "1 шт", lowestPrice: 60 })];
    assert.equal(chooseProduct({ ...eggs, includeTerms: ["яйц"] }, options)?.id, "single");
    assert.equal(chooseProduct({ ...eggs, amount: 10 }, options)?.id, "ten");
  });
});

describe("isRecipeComplete", () => {
  it("needs every required ingredient but not the optional ones", () => {
    assert.equal(isRecipeComplete([{ optional: false, productId: "p" }, { optional: true, productId: null }]), true);
    assert.equal(isRecipeComplete([{ optional: false, productId: null }]), false);
    assert.equal(isRecipeComplete([]), false);
  });
});

describe("parseServings", () => {
  it("falls back on anything outside 1-12", () => {
    assert.equal(parseServings("4", 2), 4);
    assert.equal(parseServings("0", 2), 2);
    assert.equal(parseServings("13", 2), 2);
    assert.equal(parseServings("abc", 2), 2);
    assert.equal(parseServings(undefined, 3), 3);
  });
});
