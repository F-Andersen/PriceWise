import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { parseQuantity, productKind, unitPrice } from "./productKind";
import { bestOffer, findAlternatives, periodsFromHistory, timeWeightedAverage, type LatestPrice, type ProductWithLatest } from "./recommendations";

const now = new Date("2026-11-07T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const store = (name: string) => ({ id: name, name });
const row = (storeName: string, value: number, extra: Partial<LatestPrice> = {}): LatestPrice => ({
  storeId: storeName,
  store: store(storeName),
  price: new Prisma.Decimal(value),
  oldPrice: null,
  discountPrice: null,
  promoEndsAt: null,
  isAvailable: true,
  lastSeenAt: new Date("2026-11-07T06:00:00Z"),
  ...extra
});
const product = (id: string, name: string, volume: string, latest: LatestPrice[]): ProductWithLatest => ({ id, name, volume, latest });

describe("productKind", () => {
  it("ignores brands, fat and weight, keeps descriptive words", () => {
    assert.equal(productKind("Масло Roshen Селянське солодковершкове 82,5% 180г"), "масло солодковершкове");
    assert.equal(productKind("Масло Dziugas солодковершкове 82% 200г"), "масло солодковершкове");
    assert.equal(productKind("Сметана Міськмолзавод №1 10% 300г"), productKind("Сметана Яготинська 15% 300г"));
  });
  it("tells different products apart even in one category", () => {
    assert.notEqual(productKind("Крупа гречана Жменька несмажена"), productKind("Олія соняшникова Українська Зірка рафінована 0,81л"));
    assert.notEqual(productKind("Олія оливкова Metro Chef Extra Virgin 1л"), productKind("Олія соняшникова Українська Зірка рафінована 0,81л"));
    assert.notEqual(productKind("Молоко Яготинське безлактозне 2.5%"), productKind("Молоко Галичина ультрапастеризоване 2.5%"));
    assert.notEqual(productKind("Сир Ферма Моцарелла 45% 180г"), productKind("Сир Гауда 48%"));
  });
  it("treats flavours of one product as the same kind", () => {
    assert.equal(productKind("Йогурт Дольче вишня 2,5% 290г"), productKind("Йогурт Дольче персик 2,5% 290г"));
    assert.equal(productKind("Йогурт Дольче Лісові ягоди 2,5% 290г"), "йогурт");
  });
  it("uses species and cut for meat, so thigh is not liver", () => {
    assert.notEqual(productKind("Стегно куряче охолоджене"), productKind("Печінка куряча Наша Ряба охолоджена 700г"));
    assert.equal(productKind("Філе куряче Наша Ряба охолоджене ~1кг"), productKind("Філе куряче охолоджене"));
    assert.notEqual(productKind("Філе куряче охолоджене"), productKind("Філе стегна куряче охолоджене"));
  });
});

describe("parseQuantity and unitPrice", () => {
  it("reads pack sizes in kg, l and pieces", () => {
    assert.deepEqual(parseQuantity("180 г"), { amount: 0.18, unit: "кг" });
    assert.deepEqual(parseQuantity("1.5 л"), { amount: 1.5, unit: "л" });
    assert.deepEqual(parseQuantity("810 мл"), { amount: 0.81, unit: "л" });
    assert.deepEqual(parseQuantity("за 1 кг"), { amount: 1, unit: "кг" });
    assert.deepEqual(parseQuantity("1 шт"), { amount: 1, unit: "шт" });
    assert.equal(parseQuantity("невідомо"), null);
  });
  it("converts a pack price to a price per kg", () => {
    assert.deepEqual(unitPrice(79.99, "180 г"), { value: 444.39, unit: "кг" });
  });
});

describe("bestOffer", () => {
  it("picks the cheapest available store per unit and respects ended promotions", () => {
    const offer = bestOffer(
      product("p", "Масло X солодковершкове", "200 г", [
        row("A", 100),
        row("B", 80, { oldPrice: new Prisma.Decimal(120), discountPrice: new Prisma.Decimal(80), promoEndsAt: new Date(now.getTime() - DAY) }),
        row("C", 50, { isAvailable: false })
      ]),
      now
    );
    assert.equal(offer?.store.name, "A");
    assert.equal(offer?.unitPrice, 500);
  });
});

describe("bestOffer with expired prices", () => {
  it("skips a price that is no longer confirmed", () => {
    const offer = bestOffer(
      product("p", "Масло X солодковершкове", "200 г", [row("old", 10, { lastSeenAt: new Date("2026-11-01T06:00:00Z") }), row("fresh", 100)]),
      now
    );
    assert.equal(offer?.store.name, "fresh");
  });
  it("returns nothing when every price is expired", () => {
    assert.equal(bestOffer(product("p", "Масло X", "200 г", [row("old", 10, { lastSeenAt: new Date("2026-11-01T06:00:00Z") })]), now), null);
  });
});

describe("findAlternatives", () => {
  const butter180 = product("roshen", "Масло Roshen Селянське солодковершкове 82,5% 180г", "180 г", [row("Novus", 79.99)]);
  const butter200 = product("auchan", "Масло Auchan Екстра солодковершкове 82,5% 200г", "200 г", [row("Ашан", 109)]);
  const butter200dz = product("dziugas", "Масло Dziugas солодковершкове 82% 200г", "200 г", [row("Ашан", 118)]);
  const buckwheat = product("buck", "Крупа гречана Жменька несмажена", "900 г", [row("Ашан", 50)]);

  it("suggests only the same kind of product, cheaper per kg", () => {
    // Auchan: 545 грн/кг; Roshen: 444.39 грн/кг (18% cheaper); Dziugas: 590 грн/кг (more expensive); buckwheat is another product.
    const result = findAlternatives(butter200, [butter180, butter200dz, buckwheat], { now });
    assert.deepEqual(result.map((item) => [item.productId, item.savingPercent]), [["roshen", 18]]);
    assert.equal(result[0].targetUnitPrice, 545);
  });
  it("compares per unit, not per pack: a cheaper pack can be dearer per kg", () => {
    const small = product("small", "Сметана А 15% 200г", "200 г", [row("x", 40)]); // 200 грн/кг
    const big = product("big", "Сметана Б 15% 400г", "400 г", [row("y", 60)]); // 150 грн/кг
    assert.deepEqual(findAlternatives(big, [small], { now }), []);
    assert.equal(findAlternatives(small, [big], { now })[0]?.savingPercent, 25);
  });
  it("ignores savings under 5% and products with incomparable units", () => {
    const a = product("a", "Сметана А 15% 300г", "300 г", [row("x", 60)]);
    const b = product("b", "Сметана Б 15% 300г", "300 г", [row("y", 58)]); // ~3%
    const c = product("c", "Сметана В 15% 0,3л", "300 мл", [row("z", 10)]); // litres vs kg
    assert.deepEqual(findAlternatives(a, [b, c], { now }), []);
  });
});

describe("timeWeightedAverage", () => {
  const start = new Date(now.getTime() - 30 * DAY);
  it("weights each price by how long it was valid", () => {
    // 100 for 20 days, then 70 for 10 days → (100*20 + 70*10) / 30 = 90
    const periods = [
      { value: 100, from: new Date(now.getTime() - 30 * DAY), to: new Date(now.getTime() - 10 * DAY) },
      { value: 70, from: new Date(now.getTime() - 10 * DAY), to: now }
    ];
    assert.equal(timeWeightedAverage(periods, start, now), 90);
  });
  it("needs at least a week of history", () => {
    assert.equal(timeWeightedAverage([{ value: 10, from: new Date(now.getTime() - 3 * DAY), to: now }], start, now), null);
  });
  it("builds periods that end where the next price starts", () => {
    const periods = periodsFromHistory([
      { value: 70, dateCollected: new Date("2026-11-05T00:00:00Z"), lastSeenAt: new Date("2026-11-07T00:00:00Z") },
      { value: 100, dateCollected: new Date("2026-11-01T00:00:00Z"), lastSeenAt: new Date("2026-11-04T00:00:00Z") }
    ]);
    assert.deepEqual(periods.map((period) => [period.value, period.to.toISOString().slice(0, 10)]), [[100, "2026-11-05"], [70, "2026-11-07"]]);
  });
});
