import { prisma } from "../../prisma";

/**
 * Stores we collect prices from. All of them are partner storefronts on the
 * zakaz.ua platform; their robots.txt allows product, category and promotion pages
 * for all user agents (only /n/ is disallowed).
 *
 * Not collected on purpose:
 * - stores-api.zakaz.ua: its robots.txt disallows all bots;
 * - АТБ, Сільпо: return 403 to bots, we do not bypass that.
 */
export const zakazStores = [
  { name: "Novus", host: "novus.zakaz.ua" },
  { name: "METRO", host: "metro.zakaz.ua" },
  { name: "Ашан", host: "auchan.zakaz.ua" },
  { name: "Таврія В", host: "tavriav.zakaz.ua" },
  { name: "МегаМаркет", host: "megamarket.zakaz.ua" }
] as const;

export type ZakazStoreConfig = (typeof zakazStores)[number];

/**
 * Placeholder for the required Store.city column. Pages are read without an address, so
 * the site serves its "default" store and does not say which city that is: prices are not
 * tied to a known city. The app says so instead of showing this value.
 */
const DEFAULT_CITY = "Київ";

/** In dry-run mode missing stores are not created; a placeholder is returned instead. */
export async function ensureZakazStores(dryRun = false) {
  const result = [];
  for (const config of zakazStores) {
    const sourceUrl = `https://${config.host}`;
    const existing = await prisma.store.findFirst({ where: { name: config.name } });
    const store =
      existing ??
      (dryRun
        ? { id: `dry-run-${config.host}`, name: config.name, city: DEFAULT_CITY, sourceUrl, logoUrl: null }
        : await prisma.store.create({ data: { name: config.name, city: DEFAULT_CITY, sourceUrl } }));
    result.push({ config, store });
  }
  return result;
}

export const BOT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PriceWiseBot/0.2; +https://github.com/F-Andersen/PriceWise)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.6"
};

/** Pause between requests so we stay a polite, low-volume visitor. */
export const REQUEST_DELAY_MS = 1500;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Prisma filter for stores we actively collect prices from. Other stores stay in the
 * DB (with their old data) but are hidden from lists and comparisons.
 */
export const collectedStoresWhere = { name: { in: zakazStores.map((store) => store.name) } };

/** Collected stores minus the ones this user switched off. */
export function selectedStoresWhere(excludedIds: string[] = []) {
  return excludedIds.length ? { ...collectedStoresWhere, id: { notIn: excludedIds } } : collectedStoresWhere;
}
