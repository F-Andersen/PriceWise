import type { Product, Store } from "@prisma/client";
import { prisma } from "../../prisma";
import { roundMoney, toNumber } from "../../utils/money";
import { classifyBarcode } from "./gtin";
import { recordPriceObservation } from "./priceHistory";
import { categoryLabel, crawlStoreCategories, volumeLabel } from "./zakazCategoryCrawl";
import { isSharpChange, looksLikeMassFailure, recheckDelayMs, verifySharpChanges, type PendingCheck } from "./priceVerification";
import { BOT_HEADERS, REQUEST_DELAY_MS, ensureZakazStores, sleep, type ZakazStoreConfig } from "./zakazStores";

/** Product fields we read from the page's embedded Next.js state. */
export type ZakazProduct = {
  ean: string;
  title: string;
  price: number; // kopecks
  discount?: { status?: boolean; old_price?: number; due_date?: string | null } | null;
  in_stock?: boolean;
  web_url?: string;
  img?: Record<string, string> | null;
  // Not used for prices; logged as evidence when a price changes sharply.
  price_wholesale?: unknown;
  quantity?: unknown;
  take_more?: unknown;
  // Pack size, brand and age limits, read when a product is added from a category page.
  bundle?: number | null;
  unit?: string | null;
  weight?: number | null;
  volume?: number | null;
  producer?: { trademark?: string | null } | null;
  is_alcohol?: boolean;
  is_nicotine?: boolean;
};

type FetchOutcome =
  | { status: "found"; product: ZakazProduct; url: string }
  // definite: the store really said so (404, price 0, another barcode). A page we could
  // not read says nothing about the product, so it must not mark it out of stock.
  | { status: "not_found"; reason: string; definite: boolean }
  | { status: "error"; reason: string };

export type CatalogSyncRow = {
  product: string;
  store: string;
  status: "created" | "marked_unavailable" | "not_found" | "skipped" | "error" | "unconfirmed";
  price?: number;
  oldPrice?: number | null;
  inStock?: boolean;
  reason?: string;
};

export type CatalogSyncOptions = {
  dryRun?: boolean;
  storeNames?: string[];
  /** Only these categories (without the chain suffix). A partial crawl skips the "not listed" check. */
  categories?: string[];
  /** Stop each category after this many pages. A partial crawl skips the "not listed" check. */
  maxPages?: number;
};

export function extractZakazProduct(html: string): ZakazProduct | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) return null;
  try {
    const data = JSON.parse(match[1]);
    const product = data?.props?.initialState?.product?.productData?.product;
    if (!product || typeof product.ean !== "string" || typeof product.price !== "number") return null;
    return product as ZakazProduct;
  } catch {
    return null;
  }
}

async function fetchZakazProduct(url: string, expectedGtin14: string | null): Promise<FetchOutcome> {
  try {
    const response = await fetch(url, { headers: BOT_HEADERS, redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (response.status === 404) return { status: "not_found", reason: "404", definite: true };
    if (!response.ok) return { status: "error", reason: `HTTP ${response.status}` };

    const product = extractZakazProduct(await response.text());
    if (!product) return { status: "not_found", reason: "No product data on page", definite: false };

    // Exact match only: the page must describe the same barcode we asked for.
    if (expectedGtin14 && product.ean.padStart(14, "0") !== expectedGtin14) {
      return { status: "not_found", reason: `Barcode mismatch (${product.ean})`, definite: true };
    }

    // The platform renders a page for any known GTIN, even if this store never sold it:
    // price 0 means "not in this store's assortment", not "free".
    if (product.price <= 0) return { status: "not_found", reason: "Not in store assortment (price 0)", definite: true };

    return { status: "found", product, url: product.web_url ?? response.url };
  } catch (error) {
    return { status: "error", reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * "2026-11-10" -> the end of that day in Kyiv. Uses UTC+2 (winter time), so in
 * summer the promotion is treated as ending one hour later than it really does.
 */
export function promoEnd(dueDate?: string | null) {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const date = new Date(`${dueDate}T23:59:59+02:00`);
  return Number.isNaN(+date) ? null : date;
}

export function pricesFrom(product: ZakazProduct) {
  const price = roundMoney(product.price / 100);
  const old = product.discount?.status && product.discount.old_price ? roundMoney(product.discount.old_price / 100) : null;
  const oldPrice = old && old > price && old < price * 5 ? old : null;
  return { price, oldPrice, discountPrice: oldPrice ? price : null, promoEndsAt: oldPrice ? promoEnd(product.discount?.due_date) : null };
}

/** The price a shopper would see, as the store page states it. */
const shelfPrice = (product: ZakazProduct) => {
  const { price, discountPrice } = pricesFrom(product);
  return discountPrice ?? price;
};

/** Raw fields that help explain a sharp change later (promotion, wholesale tiers, pack). */
function priceEvidence(product: ZakazProduct) {
  const { price, discount, price_wholesale, quantity, bundle, unit, weight, take_more, in_stock } = product;
  return { price, discount, price_wholesale, quantity, bundle, unit, weight, take_more, in_stock };
}

type FoundOutcome = Extract<FetchOutcome, { status: "found" }>;
type RecheckItem = { product: Product; store: Store; expected: string | null; outcome: FoundOutcome; firstEvidence: unknown };

async function recordFound(
  product: Product,
  store: Store,
  found: FoundOutcome,
  collectedAt: Date,
  dryRun: boolean,
  sourceIsKnown = false
): Promise<CatalogSyncRow> {
  const { price, oldPrice, discountPrice, promoEndsAt } = pricesFrom(found.product);
  const inStock = found.product.in_stock ?? true;
  const imageUrl = found.product.img?.s350x350 ?? found.product.img?.s200x200 ?? null;
  const row: CatalogSyncRow = { product: product.name, store: store.name, status: "created", price, oldPrice, inStock };
  if (dryRun) return row;

  // A source URL belongs to exactly one product. If another row already owns it,
  // the DB has a duplicate product for this barcode; don't merge silently.
  if (!sourceIsKnown) {
    const owner = await prisma.productSource.findUnique({ where: { sourceUrl: found.url } });
    if (owner && owner.productId !== product.id) {
      return { ...row, status: "skipped", reason: "Source URL belongs to another product (duplicate barcode?)" };
    }

    await prisma.productSource.upsert({
      where: { productId_storeId: { productId: product.id, storeId: store.id } },
      create: { productId: product.id, storeId: store.id, sourceUrl: found.url },
      update: { sourceUrl: found.url }
    });
  }

  await recordPriceObservation({
    productId: product.id,
    storeId: store.id,
    price,
    oldPrice,
    discountPrice,
    promoEndsAt,
    isAvailable: inStock,
    imageUrl,
    sourceUrl: found.url,
    seenAt: collectedAt
  });

  if (!product.imageUrl && imageUrl) {
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });
  }

  return row;
}

/**
 * The store used to sell this product but its page is gone now. Record that the
 * product is unavailable so comparisons stop using the stale price.
 */
async function recordGone(product: Product, store: Store, collectedAt: Date, reason: string, dryRun: boolean): Promise<CatalogSyncRow> {
  const last = await prisma.price.findFirst({
    where: { productId: product.id, storeId: store.id },
    orderBy: [{ dateCollected: "desc" }, { id: "desc" }]
  });
  if (!last) return { product: product.name, store: store.name, status: "not_found", reason };

  // Already marked unavailable: this only confirms it (extends lastSeenAt).
  if (!dryRun) {
    await recordPriceObservation({
      productId: product.id,
      storeId: store.id,
      price: last.price,
      isAvailable: false,
      sourceUrl: last.sourceUrl,
      seenAt: collectedAt
    });
  }
  if (!last.isAvailable) return { product: product.name, store: store.name, status: "not_found", reason };
  return { product: product.name, store: store.name, status: "marked_unavailable", price: toNumber(last.price), reason };
}

/** Above this many unlisted products in a store whose crawl failed, single-page checks are skipped. */
const MAX_UNSEEN_CHECKS_AFTER_FAILURE = 200;

/** Categories whose products came from the old promotion import; a real category replaces them. */
const PLACEHOLDER_CATEGORIES = new Set(["Акційні товари", "Крупи"]);

/**
 * Collects each chain's food catalogue from its category pages.
 *
 * - A product with a global GTIN is the same product in every chain, so listing it
 *   in several chains joins them automatically.
 * - Store-internal codes (weighed goods, own numbering) stay separate per store and
 *   are joined later by the name rules in freshProduceMatching.ts.
 * - A known product that was in stock but is no longer listed gets its own page
 *   checked, so one missing listing cannot mark it out of stock.
 */
export async function syncZakazCatalog(options: CatalogSyncOptions = {}) {
  const { dryRun = false, storeNames, categories, maxPages } = options;
  const collectedAt = new Date();
  const stores = (await ensureZakazStores(dryRun)).filter(({ config }) => !storeNames || storeNames.includes(config.name));
  const products = await prisma.product.findMany({ include: { sources: true }, orderBy: { name: "asc" } });

  const productBySource = new Map<string, Product>(products.flatMap((product) => product.sources.map((source) => [source.sourceUrl, product] as const)));
  const productByBarcode = new Map<string, Product>(products.map((product) => [product.barcode, product]));

  const rows: CatalogSyncRow[] = [];
  const pendingChecks: PendingCheck<RecheckItem>[] = [];
  // Newly vanished products per store, applied after the pass once we know how many there are.
  const goneCandidates = new Map<string, Array<{ product: Product; store: Store; reason: string }>>();
  const seen = new Set<string>();

  let firstRequest = true;
  const pause = async () => {
    if (!firstRequest) await sleep(REQUEST_DELAY_MS);
    firstRequest = false;
  };
  const politeFetch = async (url: string, gtin14: string | null) => {
    await pause();
    return fetchZakazProduct(url, gtin14);
  };
  const fetchListing = async (url: string) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await pause();
      try {
        const response = await fetch(url, { headers: BOT_HEADERS, redirect: "follow", signal: AbortSignal.timeout(30000) });
        if (response.ok) return await response.text();
      } catch {
        // retried once below
      }
    }
    return null;
  };

  /** Records a reading, or holds it back for a second look if the price jumped. */
  const processFound = async (product: Product, store: Store, outcome: FoundOutcome, expected: string | null, sourceIsKnown: boolean) => {
    const previous = dryRun
      ? null
      : await prisma.price.findFirst({ where: { productId: product.id, storeId: store.id }, orderBy: [{ dateCollected: "desc" }, { id: "desc" }] });
    const previousPrice = previous?.isAvailable ? toNumber(previous.discountPrice ?? previous.price) : null;
    const first = shelfPrice(outcome.product);
    if (previousPrice !== null && isSharpChange(previousPrice, first)) {
      // Not recorded yet: the page is read again after the main pass.
      pendingChecks.push({ previous: previousPrice, first, item: { product, store, expected, outcome, firstEvidence: priceEvidence(outcome.product) } });
    } else {
      rows.push(await recordFound(product, store, outcome, collectedAt, dryRun, sourceIsKnown));
    }
  };

  const findOrCreateProduct = async (item: ZakazProduct, url: string, categoryId: string, host: string) => {
    const bySource = productBySource.get(url);
    if (bySource) return { product: bySource, sourceIsKnown: true };

    const { kind, gtin14 } = classifyBarcode(item.ean);
    const candidates = kind === "global" && gtin14 ? [gtin14, gtin14.replace(/^0/, "")] : [`${host}:${item.ean}`];
    const existing = candidates.map((barcode) => productByBarcode.get(barcode)).find(Boolean);
    if (existing) return { product: existing, sourceIsKnown: false };

    const created = await prisma.product.create({
      data: {
        name: item.title,
        brand: item.producer?.trademark?.trim() || "Без бренду",
        category: categoryLabel(categoryId, host, item.title),
        barcode: candidates[0],
        unit: "шт",
        volume: volumeLabel(item),
        imageUrl: item.img?.s350x350 ?? item.img?.s200x200 ?? null
      }
    });
    productByBarcode.set(created.barcode, created);
    return { product: created, sourceIsKnown: false };
  };

  /** Fills details the old promotion import could only guess. */
  const improveProduct = async (product: Product, item: ZakazProduct, categoryId: string, host: string) => {
    const data: { category?: string; volume?: string } = {};
    if (PLACEHOLDER_CATEGORIES.has(product.category)) data.category = categoryLabel(categoryId, host, product.name);
    const volume = volumeLabel(item);
    if (product.volume === "1 шт" && volume !== "1 шт") data.volume = volume;
    if (!Object.keys(data).length) return;
    await prisma.product.update({ where: { id: product.id }, data });
    Object.assign(product, data);
  };

  const incompleteStores = new Map<string, string[]>();
  for (const { config, store } of stores) {
    const listedUrls = new Set<string>();
    const crawl = await crawlStoreCategories(
      config.host,
      {
        fetchPage: fetchListing,
        onItem: async (item, categoryId) => {
          const url = item.web_url;
          if (!url || listedUrls.has(url) || item.is_alcohol || item.is_nicotine || item.price <= 0) return;
          listedUrls.add(url); // a product can be listed in several categories
          const outcome: FoundOutcome = { status: "found", product: item, url };
          if (dryRun) {
            rows.push(await recordFound({ name: item.title } as Product, store, outcome, collectedAt, true));
            return;
          }
          try {
            const { product, sourceIsKnown } = await findOrCreateProduct(item, url, categoryId, config.host);
            await improveProduct(product, item, categoryId, config.host);
            seen.add(`${product.id}:${store.id}`);
            await processFound(product, store, outcome, null, sourceIsKnown);
            if (!sourceIsKnown) productBySource.set(url, product);
          } catch (error) {
            rows.push({ product: item.title, store: store.name, status: "error", reason: error instanceof Error ? error.message : "Could not save the product" });
          }
        }
      },
      { categories, maxPages }
    );
    for (const failed of crawl.failedCategories) {
      rows.push({ product: `[category] ${failed}`, store: store.name, status: "error", reason: "Category page could not be read" });
    }
    if (crawl.failedCategories.length) incompleteStores.set(store.id, crawl.failedCategories);
  }

  // A partial crawl says nothing about what is not listed; neither does a dry run.
  const fullCrawl = !dryRun && !categories?.length && !maxPages;
  const knownInStore = new Map<string, number>();
  if (fullCrawl) {
    for (const { store } of stores) {
      const unseen = products.flatMap((product) => {
        const source = product.sources.find((item) => item.storeId === store.id);
        return source && !seen.has(`${product.id}:${store.id}`) ? [{ product, source }] : [];
      });
      knownInStore.set(store.id, products.filter((product) => product.sources.some((item) => item.storeId === store.id)).length);

      if (incompleteStores.has(store.id) && unseen.length > MAX_UNSEEN_CHECKS_AFTER_FAILURE) {
        console.warn(`[prices] unlisted check skipped ${JSON.stringify({ store: store.name, unseen: unseen.length, failedCategories: incompleteStores.get(store.id) })}`);
        continue;
      }

      for (const { product, source } of unseen) {
        const last = await prisma.price.findFirst({ where: { productId: product.id, storeId: store.id }, orderBy: [{ dateCollected: "desc" }, { id: "desc" }] });
        if (!last?.isAvailable) continue; // already out of stock: nothing to change

        const { kind, gtin14 } = classifyBarcode(product.barcode);
        const expected = kind === "global" ? gtin14 : null;
        const outcome = await politeFetch(source.sourceUrl, expected);
        if (outcome.status === "found") {
          await processFound(product, store, outcome, expected, true);
        } else if (outcome.status === "error" || !outcome.definite) {
          rows.push({ product: product.name, store: store.name, status: outcome.status === "error" ? "error" : "unconfirmed", reason: outcome.reason });
        } else {
          goneCandidates.set(store.id, [...(goneCandidates.get(store.id) ?? []), { product, store, reason: outcome.reason }]);
        }
      }
    }
  }

  for (const [storeId, candidates] of goneCandidates) {
    const known = knownInStore.get(storeId) ?? 0;
    if (looksLikeMassFailure(candidates.length, known)) {
      console.warn(`[prices] mass disappearance ignored ${JSON.stringify({ store: candidates[0].store.name, gone: candidates.length, known, reasons: [...new Set(candidates.map((item) => item.reason))] })}`);
      rows.push(...candidates.map(({ product, store, reason }) => ({ product: product.name, store: store.name, status: "unconfirmed" as const, reason: `Too many products vanished at once; not marked out of stock (${reason})` })));
    } else {
      for (const { product, store, reason } of candidates) rows.push(await recordGone(product, store, collectedAt, reason, dryRun));
    }
  }

  rows.push(
    ...(await verifySharpChanges<RecheckItem, CatalogSyncRow>(pendingChecks, recheckDelayMs(), {
      wait: sleep,
      readAgain: async (item) => {
        const again = await politeFetch(item.outcome.url, item.expected);
        if (again.status !== "found") return null;
        item.outcome = again; // the freshest reading is the one that gets recorded
        return { price: shelfPrice(again.product), evidence: priceEvidence(again.product) };
      },
      accept: (item) => recordFound(item.product, item.store, item.outcome, collectedAt, dryRun),
      reject: (item, second) => ({
        product: item.product.name,
        store: item.store.name,
        status: "unconfirmed",
        reason: `Sharp price change not confirmed by a second reading (${second ?? "no reading"}); previous price kept`
      }),
      log: ({ item, previous, first, second, decision, evidence }) =>
        console.warn(
          `[prices] sharp change ${JSON.stringify({
            decision,
            store: item.store.name,
            product: item.product.name,
            url: item.outcome.url,
            previous,
            first,
            second,
            firstReading: item.firstEvidence,
            secondReading: evidence
          })}`
        )
    }))
  );

  return { collectedAt, rows, summary: summarize(rows, stores.map(({ config }) => config)) };
}

function summarize(rows: CatalogSyncRow[], stores: readonly ZakazStoreConfig[]) {
  return stores.map((store) => {
    const storeRows = rows.filter((row) => row.store === store.name);
    const count = (status: CatalogSyncRow["status"]) => storeRows.filter((row) => row.status === status).length;
    return {
      store: store.name,
      prices: count("created"),
      inStock: storeRows.filter((row) => row.status === "created" && row.inStock).length,
      onSale: storeRows.filter((row) => row.status === "created" && row.oldPrice).length,
      notFound: count("not_found"),
      markedUnavailable: count("marked_unavailable"),
      unconfirmed: count("unconfirmed"),
      skipped: count("skipped"),
      errors: count("error")
    };
  });
}
