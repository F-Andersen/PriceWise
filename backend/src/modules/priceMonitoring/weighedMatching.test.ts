import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freshMeatMatch } from "./freshMeatMatching";
import { weighedMatch } from "./freshProduceMatching";

const weighed = (name: string, barcode = "02200000000000") => weighedMatch({ name, barcode, volume: "за 1 кг" });
const key = (name: string) => weighed(name)?.key ?? null;
const meatKey = (name: string) => freshMeatMatch(name)?.key ?? null;

describe("weighed fresh produce", () => {
  it("matches the same vegetable regardless of word order and country", () => {
    assert.equal(key("Капуста молода"), key("Молода капуста"));
    assert.equal(key("Морква Україна"), key("Морква"));
    assert.equal(key("Капуста цвітна"), "капуста цвітна");
  });
  it("keeps varieties apart", () => {
    assert.notEqual(key("Картопля рожева"), key("Картопля"));
    assert.notEqual(key("Огірок довгоплідний Україна"), key("Огірок короткоплідний"));
  });
  it("keeps chili apart from bell pepper", () => {
    assert.notEqual(key("Перець чилі"), key("Перець червоний"));
  });
  it("never matches products with a real barcode, per-piece goods or store brands", () => {
    assert.equal(weighedMatch({ name: "Капуста цвітна", barcode: "04820017000024", volume: "за 1 кг" }), null);
    assert.equal(weighedMatch({ name: "Капуста цвітна", barcode: "02200000000000", volume: "1 шт" }), null);
    assert.equal(key("Лайм Metro Chef"), null);
  });
  it("ignores names where produce is not the main noun", () => {
    assert.equal(key("Суміш овочева з капустою"), null);
  });
});

describe("weighed fresh meat", () => {
  it("matches the same cut named differently", () => {
    assert.equal(meatKey("Філе стегна курчат-бройлерів охолоджене"), meatKey("Курка філе стегна"));
    assert.equal(meatKey("Стегно курчати-бройлера охолоджене"), meatKey("Курка стегно"));
    assert.equal(meatKey("Гомілка куряча охолоджена"), meatKey("Курка гомілка"));
  });
  it("keeps different cuts, states, species and brands apart", () => {
    assert.notEqual(meatKey("Стегно куряче"), meatKey("Філе стегна куряче"));
    assert.notEqual(meatKey("Філе куряче"), meatKey("Філе стегна куряче"));
    assert.notEqual(meatKey("Філе куряче охолоджене"), meatKey("Філе куряче заморожене"));
    assert.notEqual(meatKey("Стегно куряче"), meatKey("Стегно індиче"));
    assert.notEqual(meatKey("Філе куряче"), meatKey("Філе куряче Наша Ряба"));
    assert.notEqual(meatKey("Стегно куряче без шкіри"), meatKey("Стегно куряче"));
  });
  it("rejects processed meat and mixes of species", () => {
    for (const name of ["Ковбаса куряча варена", "Шинка з філе курки", "Сосиски курячі", "Крила курячі копчені", "Фарш свинно-яловичий"]) {
      assert.equal(meatKey(name), null, name);
    }
  });
  it("names the merged product clearly and keeps the brand", () => {
    assert.deepEqual(freshMeatMatch("Філе стегна куряче Супер Філео без кісточки охолоджене ~1кг"), {
      key: "meat куряче філе стегна охолоджене супер філео",
      name: "Філе стегна куряче Супер Філео охолоджене",
      brand: "Супер Філео",
      species: "куряче",
      cut: "філе стегна",
      state: "охолоджене"
    });
  });
});
