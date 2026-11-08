import type { ZakazProduct } from "./zakazCatalogSync";

/**
 * Walks a chain's food categories page by page. Every page's embedded state has
 * up to 30 products with barcode, price, promotion and pack size, so one request
 * covers 30 products. Parsing and crawling are separate from the database: fetching
 * and handling are passed in, which keeps this testable without a network.
 */

export const PAGE_SIZE = 30;

export type CategoryNode = { id: string; title?: string; count?: number };

function nextData(html: string): any | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1])?.props?.initialState ?? null;
  } catch {
    return null;
  }
}

export function parseCategoryTree(html: string): CategoryNode[] {
  const list = nextData(html)?.categories?.categories;
  return Array.isArray(list) ? list.filter((node) => typeof node?.id === "string") : [];
}

export function parseCategoryPage(html: string): { items: ZakazProduct[]; countAvailable: number } | null {
  const data = nextData(html)?.catalogue?.categoryData;
  if (!data || !Array.isArray(data.results)) return null;
  return { items: data.results, countAvailable: Number(data.count_available ?? data.count ?? 0) };
}

/** Chains add their own suffix to category ids: "grocery-tavriav" is "grocery". */
export function normalizeCategoryId(id: string, host: string) {
  return id.replace(new RegExp(`-${host.split(".")[0]}$`), "");
}

/** Food only. Alcohol, tobacco, household goods and the like are not collected. */
const FOOD_CATEGORIES: Record<string, string> = {
  "dairy-and-eggs": "Молочні продукти",
  "fruits-and-vegetables": "Овочі",
  "meat-fish-poultry": "М'ясо",
  "fish-and-seafood": "Риба",
  bakery: "Хліб",
  grocery: "Бакалія",
  "packets-cereals": "Бакалія",
  drinks: "Напої",
  "hot-drinks": "Чай і кава",
  "sauces-and-spices": "Соуси та спеції",
  frozen: "Заморожені продукти",
  "canned-food": "Консерви",
  "tins-jars-cooking": "Консерви",
  "snacks-and-sweets": "Солодощі",
  snacks: "Снеки",
  "crisps-and-snacks": "Снеки",
  "ready-meals": "Готові страви",
  culinary: "Готові страви"
};

export function selectFoodCategories(tree: CategoryNode[], host: string, only?: string[]) {
  return tree.filter((node) => {
    const id = normalizeCategoryId(node.id, host);
    return id in FOOD_CATEGORIES && (!only?.length || only.includes(id));
  });
}

const FRUIT_WORDS = /(яблу|банан|апельсин|мандарин|лимон|лайм|ягод|полуниц|груш|виноград|персик|нектарин|слив|ківі|манго|ананас|гранат|авокадо|хурм|абрикос|диня|дин[іь]|кавун|грейпфрут|малин|чорниц|лохин|помело)/i;

/** Our category for a product from this store category. */
export function categoryLabel(categoryId: string, host: string, name: string) {
  const id = normalizeCategoryId(categoryId, host);
  if (id === "fruits-and-vegetables" && FRUIT_WORDS.test(name)) return "Фрукти";
  return FOOD_CATEGORIES[id] ?? "Інше";
}

/** Pack size in the format the rest of the app reads: "180 г", "1.5 л", "за 1 кг", "1 шт". */
export function volumeLabel(product: Pick<ZakazProduct, "unit" | "weight" | "volume" | "bundle">) {
  if (product.unit === "kg") return "за 1 кг";
  const bundle = Number(product.bundle);
  if (bundle > 1) return `${bundle} шт`;
  const weight = Number(product.weight);
  if (weight > 0) return weight >= 1000 ? `${weight / 1000} кг` : `${weight} г`;
  const volume = Number(product.volume);
  if (volume > 0) return volume >= 1000 ? `${volume / 1000} л` : `${volume} мл`;
  return "1 шт";
}

export type CrawlDeps = {
  fetchPage: (url: string) => Promise<string | null>;
  onItem: (item: ZakazProduct, categoryId: string) => Promise<void>;
};

export type CrawlResult = { pagesFetched: number; itemsSeen: number; failedCategories: string[] };

/**
 * Crawls the categories of one chain. A category is read up to its available count:
 * the site lists products in stock first. A failed page marks the category as failed,
 * and the crawl moves on to the next one, so the caller knows the store's list is incomplete.
 */
export async function crawlStoreCategories(
  host: string,
  deps: CrawlDeps,
  options: { categories?: string[]; maxPages?: number } = {}
): Promise<CrawlResult> {
  const result: CrawlResult = { pagesFetched: 0, itemsSeen: 0, failedCategories: [] };
  const home = await deps.fetchPage(`https://${host}/uk/`);
  const categories = home ? selectFoodCategories(parseCategoryTree(home), host, options.categories) : [];
  if (!categories.length) {
    result.failedCategories.push("(category list)");
    return result;
  }

  for (const category of categories) {
    let page = 1;
    while (true) {
      const html = await deps.fetchPage(`https://${host}/uk/categories/${category.id}/${page > 1 ? `?page=${page}` : ""}`);
      const parsed = html ? parseCategoryPage(html) : null;
      if (!parsed) {
        result.failedCategories.push(`${category.id} (page ${page})`);
        break;
      }
      result.pagesFetched += 1;
      for (const item of parsed.items) {
        result.itemsSeen += 1;
        await deps.onItem(item, category.id);
      }
      const lastPage = Math.ceil(parsed.countAvailable / PAGE_SIZE);
      if (!parsed.items.length || page >= lastPage || (options.maxPages && page >= options.maxPages)) break;
      page += 1;
    }
  }
  return result;
}
