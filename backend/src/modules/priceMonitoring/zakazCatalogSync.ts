import type { Product, Store } from "@prisma/client";
import { prisma } from "../../prisma";
import { roundMoney, toNumber } from "../../utils/money";
import { classifyBarcode } from "./gtin";
import { recordPriceObservation } from "./priceHistory";
import { BOT_HEADERS, REQUEST_DELAY_MS, ensureZakazStores, sleep, type ZakazStoreConfig } from "./zakazStores";

/** Product fields we read from the page's embedded Next.js state. */
type ZakazProduct = {
  ean: string;
  title: string;
  price: number; // kopecks
  discount?: { status?: boolean; old_price?: number; due_date?: string | null } | null;
  in_stock?: boolean;
  web_url?: string;
  img?: Record<string, string> | null;
};

type FetchOutcome =
  | { status: "found"; product: ZakazProduct; url: string }
  | { status: "not_found"; reason: string }
  | { status: "error"; reason: string };

export type CatalogSyncRow = {
  product: string;
  store: string;
  status: "created" | "marked_unavailable" | "not_found" | "skipped" | "error";
  price?: number;
  oldPrice?: number | null;
  inStock?: boolean;
  reason?: string;
};

export type CatalogSyncOptions = {
  dryRun?: boolean;
  limit?: number;
  storeNames?: string[];
};

function extractZakazProduct(html: string): ZakazProduct | null {
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
    if (response.status === 404) return { status: "not_found", reason: "404" };
    if (!response.ok) return { status: "error", reason: `HTTP ${response.status}` };

    const product = extractZakazProduct(await response.text());
    if (!product) return { status: "not_found", reason: "No product data on page" };

    // Exact match only: the page must describe the same barcode we asked for.
    if (expectedGtin14 && product.ean.padStart(14, "0") !== expectedGtin14) {
      return { status: "not_found", reason: `Barcode mismatch (${product.ean})` };
    }

    // The platform renders a page for any known GTIN, even if this store never sold it:
    // price 0 means "not in this store's assortment", not "free".
    if (product.price <= 0) return { status: "not_found", reason: "Not in store assortment (price 0)" };

    return { status: "found", product, url: product.web_url ?? response.url };
  } catch (error) {
    return { status: "error", reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * "2026-11-10" -> the end of that day in Kyiv. Uses UTC+2 (winter time), so in
 * summer the promotion is treated as ending one hour later than it really does.
 */
function promoEnd(dueDate?: string | null) {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const date = new Date(`${dueDate}T23:59:59+02:00`);
  return Number.isNaN(+date) ? null : date;
}

function pricesFrom(product: ZakazProduct) {
  const price = roundMoney(product.price / 100);
  const old = product.discount?.status && product.discount.old_price ? roundMoney(product.discount.old_price / 100) : null;
  const oldPrice = old && old > price && old < price * 5 ? old : null;
  return { price, oldPrice, discountPrice: oldPrice ? price : null, promoEndsAt: oldPrice ? promoEnd(product.discount?.due_date) : null };
}

async function recordFound(
  product: Product,
  store: Store,
  found: Extract<FetchOutcome, { status: "found" }>,
  collectedAt: Date,
  dryRun: boolean
): Promise<CatalogSyncRow> {
  const { price, oldPrice, discountPrice, promoEndsAt } = pricesFrom(found.product);
  const inStock = found.product.in_stock ?? true;
  const imageUrl = found.product.img?.s350x350 ?? found.product.img?.s200x200 ?? null;
  const row: CatalogSyncRow = { product: product.name, store: store.name, status: "created", price, oldPrice, inStock };
  if (dryRun) return row;

  // A source URL belongs to exactly one product. If another row already owns it,
  // the DB has a duplicate product for this barcode; don't merge silently.
  const owner = await prisma.productSource.findUnique({ where: { sourceUrl: found.url } });
  if (owner && owner.productId !== product.id) {
    return { ...row, status: "skipped", reason: "Source URL belongs to another product (duplicate barcode?)" };
  }

  await prisma.productSource.upsert({
    where: { productId_storeId: { productId: product.id, storeId: store.id } },
    create: { productId: product.id, storeId: store.id, sourceUrl: found.url },
    update: { sourceUrl: found.url }
  });

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

/**
 * Looks up every catalogue product in every zakaz.ua store by barcode.
 *
 * - Global GTINs are searched in all stores via /uk/products/<gtin>/ (the site
 *   redirects to the canonical page) and accepted only on an exact barcode match.
 * - Store-internal codes (weighed goods, own-store numbering) are only refreshed at
 *   the store page we already know; they are never matched across stores.
 */
export async function syncZakazCatalog(options: CatalogSyncOptions = {}) {
  const { dryRun = false, limit, storeNames } = options;
  const collectedAt = new Date();
  const stores = (await ensureZakazStores(dryRun)).filter(({ config }) => !storeNames || storeNames.includes(config.name));
  const products = await prisma.product.findMany({
    include: { sources: true },
    orderBy: { name: "asc" },
    take: limit
  });

  const rows: CatalogSyncRow[] = [];
  let firstRequest = true;
  const politeFetch = async (url: string, gtin14: string | null) => {
    if (!firstRequest) await sleep(REQUEST_DELAY_MS);
    firstRequest = false;
    return fetchZakazProduct(url, gtin14);
  };

  for (const product of products) {
    const { kind, gtin14 } = classifyBarcode(product.barcode);

    for (const { config, store } of stores) {
      const knownSource = product.sources.find((source) => source.storeId === store.id);
      let url: string;
      let expected: string | null;

      if (kind === "global") {
        url = `https://${config.host}/uk/products/${gtin14}/`;
        expected = gtin14;
      } else if (knownSource) {
        url = knownSource.sourceUrl;
        expected = null; // internal code: trust the page we already linked
      } else {
        rows.push({
          product: product.name,
          store: store.name,
          status: "skipped",
          reason: kind === "invalid" ? "Invalid barcode" : "Store-internal code, not matched across stores"
        });
        continue;
      }

      let outcome = await politeFetch(url, expected);
      // Barcode lookup failed but we already know this store's page: check it directly
      // (still requiring the same barcode for global GTINs).
      if (outcome.status === "not_found" && knownSource && knownSource.sourceUrl !== url) {
        outcome = await politeFetch(knownSource.sourceUrl, expected);
      }
      if (outcome.status === "found") {
        rows.push(await recordFound(product, store, outcome, collectedAt, dryRun));
      } else if (outcome.status === "not_found") {
        rows.push(knownSource ? await recordGone(product, store, collectedAt, outcome.reason, dryRun) : { product: product.name, store: store.name, status: "not_found", reason: outcome.reason });
      } else {
        rows.push({ product: product.name, store: store.name, status: "error", reason: outcome.reason });
      }
    }
  }

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
      skipped: count("skipped"),
      errors: count("error")
    };
  });
}
