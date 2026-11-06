import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractZakazProduct, pricesFrom, promoEnd, type ZakazProduct } from "./zakazCatalogSync";

const page = (product: unknown) =>
  `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { initialState: { product: { productData: { product } } } }
  })}</script></body></html>`;

describe("extractZakazProduct", () => {
  it("reads the product from the page's embedded state", () => {
    const product = extractZakazProduct(page({ ean: "04820017000024", title: "Вода", price: 2970, in_stock: true }));
    assert.equal(product?.ean, "04820017000024");
    assert.equal(product?.price, 2970);
  });
  it("returns null for pages without product data or with broken JSON", () => {
    assert.equal(extractZakazProduct("<html></html>"), null);
    assert.equal(extractZakazProduct('<script id="__NEXT_DATA__">{broken</script>'), null);
    assert.equal(extractZakazProduct(page({ title: "no barcode" })), null);
  });
});

describe("pricesFrom", () => {
  const base: ZakazProduct = { ean: "04820017000024", title: "Вода", price: 2970 };

  it("converts kopecks and keeps a real discount with its end date", () => {
    const prices = pricesFrom({ ...base, discount: { status: true, old_price: 3140, due_date: "2026-11-10" } });
    assert.equal(prices.price, 29.7);
    assert.equal(prices.oldPrice, 31.4);
    assert.equal(prices.discountPrice, 29.7);
    assert.equal(prices.promoEndsAt?.toISOString(), "2026-11-10T21:59:59.000Z");
  });
  it("ignores an inactive discount or an old price that is not higher", () => {
    assert.equal(pricesFrom({ ...base, discount: { status: false, old_price: 3140 } }).oldPrice, null);
    assert.equal(pricesFrom({ ...base, discount: { status: true, old_price: 2970 } }).oldPrice, null);
  });
  it("ignores an implausible old price (more than 5x)", () => {
    assert.equal(pricesFrom({ ...base, discount: { status: true, old_price: 50000 } }).discountPrice, null);
  });
});

describe("promoEnd", () => {
  it("returns the end of the day in Kyiv winter time", () => {
    assert.equal(promoEnd("2026-11-10")?.toISOString(), "2026-11-10T21:59:59.000Z");
  });
  it("returns null for missing or malformed dates", () => {
    assert.equal(promoEnd(null), null);
    assert.equal(promoEnd("10.11.2026"), null);
  });
});
