import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesOfferQuery } from "./offerSearch";

const coffee = {
  product: { name: "Кава в зернах Barbera Brasil 1кг", brand: "Barbera", category: "Напої" },
  store: { name: "METRO" }
};

describe("matchesOfferQuery", () => {
  it("finds by part of the name, ignoring case", () => {
    assert.equal(matchesOfferQuery(coffee, "КАВА"), true);
    assert.equal(matchesOfferQuery(coffee, "зерн"), true);
  });

  it("needs every word, in any order and across fields", () => {
    assert.equal(matchesOfferQuery(coffee, "metro зернах кава"), true);
    assert.equal(matchesOfferQuery(coffee, "напої barbera"), true);
    assert.equal(matchesOfferQuery(coffee, "кава ашан"), false);
  });

  it("matches everything for an empty query", () => {
    assert.equal(matchesOfferQuery(coffee, "   "), true);
  });

  it("treats apostrophe variants as the same", () => {
    const meat = { product: { name: "Яловичина м'ясна", brand: "x", category: "М'ясо" }, store: { name: "Ашан" } };
    assert.equal(matchesOfferQuery(meat, "м’ясо"), true);
  });
});
