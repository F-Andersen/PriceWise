import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categoryLabel, crawlStoreCategories, normalizeCategoryId, parseCategoryPage, parseCategoryTree, selectFoodCategories, volumeLabel } from "./zakazCategoryCrawl";
import type { ZakazProduct } from "./zakazCatalogSync";

const wrap = (state: unknown) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { initialState: state } })}</script>`;
const homePage = (ids: string[]) => wrap({ categories: { categories: ids.map((id) => ({ id, count: 10 })) } });
const listPage = (eans: string[], countAvailable: number) =>
  wrap({ catalogue: { categoryData: { results: eans.map((ean) => ({ ean, title: ean, price: 100 })), count: countAvailable + 5, count_available: countAvailable } } });

describe("parsing", () => {
  it("reads the category tree and a category page", () => {
    assert.deepEqual(parseCategoryTree(homePage(["bakery"])).map((node) => node.id), ["bakery"]);
    const page = parseCategoryPage(listPage(["a", "b"], 62));
    assert.equal(page?.items.length, 2);
    assert.equal(page?.countAvailable, 62);
  });
  it("returns nothing useful for a page without the data", () => {
    assert.deepEqual(parseCategoryTree("<html></html>"), []);
    assert.equal(parseCategoryPage("<html></html>"), null);
    assert.equal(parseCategoryPage('<script id="__NEXT_DATA__">{broken</script>'), null);
  });
});

describe("category selection", () => {
  const host = "tavriav.zakaz.ua";
  it("strips the chain suffix", () => {
    assert.equal(normalizeCategoryId("grocery-tavriav", host), "grocery");
    assert.equal(normalizeCategoryId("dairy-and-eggs", "novus.zakaz.ua"), "dairy-and-eggs");
  });
  it("keeps food and leaves out alcohol, tobacco and non-food", () => {
    const tree = ["dairy-and-eggs-tavriav", "alcohol-tavriav", "tobacco-goods", "eighteen-plus", "kitchenware-tavriav", "for-animals-tavriav", "bakery-tavriav"].map((id) => ({ id }));
    assert.deepEqual(selectFoodCategories(tree, host).map((node) => node.id), ["dairy-and-eggs-tavriav", "bakery-tavriav"]);
  });
  it("can be limited to chosen categories", () => {
    const tree = ["dairy-and-eggs-tavriav", "bakery-tavriav"].map((id) => ({ id }));
    assert.deepEqual(selectFoodCategories(tree, host, ["bakery"]).map((node) => node.id), ["bakery-tavriav"]);
  });
  it("splits fruit from vegetables by name", () => {
    assert.equal(categoryLabel("fruits-and-vegetables-tavriav", host, "Яблуко Голден"), "Фрукти");
    assert.equal(categoryLabel("fruits-and-vegetables-tavriav", host, "Капуста цвітна"), "Овочі");
    assert.equal(categoryLabel("dairy-and-eggs-tavriav", host, "Сир"), "Молочні продукти");
  });
});

describe("volumeLabel", () => {
  const label = (fields: Partial<ZakazProduct>) => volumeLabel({ unit: "pcs", weight: null, volume: null, bundle: 1, ...fields });
  it("describes weighed goods and packs", () => {
    assert.equal(label({ unit: "kg" }), "за 1 кг");
    assert.equal(label({ weight: 180 }), "180 г");
    assert.equal(label({ weight: 1500 }), "1.5 кг");
    assert.equal(label({ volume: 810 }), "810 мл");
    assert.equal(label({ volume: 1500 }), "1.5 л");
    assert.equal(label({}), "1 шт");
  });
  it("does not claim a single pack's weight for a multipack", () => {
    assert.equal(label({ bundle: 6, weight: 330 }), "6 шт");
  });
});

describe("crawlStoreCategories", () => {
  const host = "novus.zakaz.ua";
  const base = `https://${host}/uk`;

  function setup(pages: Record<string, string | null>) {
    const requested: string[] = [];
    const seen: Array<[string, string]> = [];
    return {
      requested,
      seen,
      deps: {
        fetchPage: async (url: string) => {
          requested.push(url);
          return pages[url] ?? null;
        },
        onItem: async (item: ZakazProduct, category: string) => {
          seen.push([item.ean, category]);
        }
      }
    };
  }

  it("reads every page up to the available count and skips non-food", async () => {
    const { deps, requested, seen } = setup({
      [`${base}/`]: homePage(["bakery", "alcohol"]),
      [`${base}/categories/bakery/`]: listPage(Array.from({ length: 30 }, (_, i) => `a${i}`), 32),
      [`${base}/categories/bakery/?page=2`]: listPage(["b0", "b1"], 32)
    });
    const result = await crawlStoreCategories(host, deps);
    assert.deepEqual(result, { pagesFetched: 2, itemsSeen: 32, failedCategories: [] });
    assert.equal(seen.length, 32);
    assert.ok(!requested.some((url) => url.includes("alcohol")));
    assert.ok(!requested.some((url) => url.includes("page=3")));
  });

  it("records a failed page and moves on to the next category", async () => {
    const { deps, seen } = setup({
      [`${base}/`]: homePage(["bakery", "drinks"]),
      [`${base}/categories/bakery/`]: listPage(Array.from({ length: 30 }, (_, i) => `a${i}`), 60),
      [`${base}/categories/drinks/`]: listPage(["d0"], 1)
    });
    const result = await crawlStoreCategories(host, deps);
    assert.deepEqual(result.failedCategories, ["bakery (page 2)"]);
    assert.ok(seen.some(([ean]) => ean === "d0"));
  });

  it("reports an unreadable category list", async () => {
    const { deps } = setup({});
    assert.deepEqual((await crawlStoreCategories(host, deps)).failedCategories, ["(category list)"]);
  });

  it("stops at maxPages", async () => {
    const { deps, requested } = setup({
      [`${base}/`]: homePage(["bakery"]),
      [`${base}/categories/bakery/`]: listPage(Array.from({ length: 30 }, (_, i) => `a${i}`), 300)
    });
    await crawlStoreCategories(host, deps, { maxPages: 1 });
    assert.equal(requested.length, 2);
  });
});
