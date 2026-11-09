import { Prisma } from "@prisma/client";
import { Request, Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";
import { prisma } from "../prisma";
import { hasMorePages, MAX_PAGE_SIZE, parsePagination } from "../utils/pagination";
import { parseExcludedStores, parseIdList } from "../utils/storeFilter";
import { selectedStoresWhere, zakazStores } from "../modules/priceMonitoring/zakazStores";
import { productKind } from "../services/productKind";
import { getAlternatives } from "../services/recommendationService";
import { isPriceFresh, maxPriceAgeMs } from "../utils/freshness";
import { activePrice, toNumber } from "../utils/money";

const router = Router();
const productSchema = z.object({
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  barcode: z.string(),
  unit: z.string(),
  volume: z.string(),
  imageUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable()
});

function latestStorePrices<T extends { storeId: string; dateCollected: Date }>(prices: T[]) {
  const map = new Map<string, T>();
  for (const price of prices.sort((a, b) => b.dateCollected.getTime() - a.dateCollected.getTime())) {
    if (!map.has(price.storeId)) map.set(price.storeId, price);
  }
  return Array.from(map.values());
}

/** Newest row per store: enough for lists, and far smaller than the whole history. */
const latestPricesInclude = (excludedStoreIds: string[]) => ({
  prices: {
    where: { store: selectedStoresWhere(excludedStoreIds) },
    include: { store: true },
    orderBy: [{ dateCollected: "desc" as const }, { id: "desc" as const }],
    distinct: ["storeId" as const]
  }
});

async function listProducts(req: Request, query: string) {
  const { page, limit, skip } = parsePagination(req.query);
  const excludedStoreIds = parseExcludedStores(req.query.excludeStores);
  const ids = parseIdList(req.query.ids, MAX_PAGE_SIZE);
  const category = typeof req.query.category === "string" && req.query.category.trim() ? req.query.category.trim() : undefined;

  // Category counts ignore the selected category, so the other chips stay available.
  const baseWhere: Prisma.ProductWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(ids.length ? { id: { in: ids } } : {})
  };
  const where: Prisma.ProductWhereInput = category ? { ...baseWhere, category } : baseWhere;

  const [items, total, facets] = await Promise.all([
    prisma.product.findMany({ where, include: latestPricesInclude(excludedStoreIds), orderBy: [{ name: "asc" }, { id: "asc" }], skip, take: limit }),
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ["category"], where: baseWhere, _count: { _all: true }, orderBy: { category: "asc" } })
  ]);

  return {
    items,
    total,
    page,
    limit,
    hasMore: hasMorePages(skip, items.length, total),
    categories: facets.map((facet) => ({ name: facet.category, count: facet._count._all }))
  };
}

router.get("/", async (req, res) => {
  res.json(await listProducts(req, ""));
});

router.get("/search", async (req, res) => {
  res.json(await listProducts(req, String(req.query.query || "").trim()));
});

/**
 * Catalogue facts for the home screen without loading the catalogue. Uses the same
 * rule as activePrice (utils/money.ts) in SQL: a discount counts while its promotion
 * runs; only available prices confirmed within the age limit are considered.
 */
router.get("/summary", async (req, res) => {
  const excludedStoreIds = parseExcludedStores(req.query.excludeStores);
  const now = new Date();
  const cutoff = new Date(now.getTime() - maxPriceAgeMs());
  const latest = Prisma.sql`
    SELECT DISTINCT ON (p."productId", p."storeId") p.*
    FROM "Price" p JOIN "Store" s ON s.id = p."storeId"
    WHERE s.name IN (${Prisma.join(zakazStores.map((store) => store.name))})
      ${excludedStoreIds.length ? Prisma.sql`AND p."storeId" NOT IN (${Prisma.join(excludedStoreIds)})` : Prisma.empty}
    ORDER BY p."productId", p."storeId", p."dateCollected" DESC, p.id DESC
  `;
  const [total, facts, cheapest] = await Promise.all([
    prisma.product.count(),
    prisma.$queryRaw<Array<{ latestCheckedAt: Date | null; storesWithPrices: bigint }>>(Prisma.sql`
      WITH latest AS (${latest})
      SELECT MAX("lastSeenAt") AS "latestCheckedAt",
             COUNT(DISTINCT "storeId") FILTER (WHERE "isAvailable" AND "lastSeenAt" >= ${cutoff}) AS "storesWithPrices"
      FROM latest
    `),
    prisma.$queryRaw<Array<{ productId: string }>>(Prisma.sql`
      WITH latest AS (${latest})
      SELECT "productId"
      FROM latest
      WHERE "isAvailable" AND "lastSeenAt" >= ${cutoff}
      GROUP BY "productId"
      ORDER BY MIN(CASE
        WHEN "discountPrice" IS NULL THEN price
        WHEN "promoEndsAt" IS NULL OR "promoEndsAt" >= ${now} THEN "discountPrice"
        ELSE COALESCE("oldPrice", price)
      END) ASC, "productId" ASC
      LIMIT 5
    `)
  ]);

  const cheapestIds = cheapest.map((row) => row.productId);
  const products = await prisma.product.findMany({ where: { id: { in: cheapestIds } }, include: latestPricesInclude(excludedStoreIds) });
  res.json({
    total,
    latestCheckedAt: facts[0]?.latestCheckedAt ?? null,
    storesWithPrices: Number(facts[0]?.storesWithPrices ?? 0),
    cheapest: cheapestIds.map((id) => products.find((product) => product.id === id)).filter(Boolean)
  });
});

router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { prices: { where: { store: selectedStoresWhere(parseExcludedStores(req.query.excludeStores)) }, include: { store: true }, orderBy: { dateCollected: "desc" } } }
  });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

router.get("/:id/market-prices", async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ message: "Product not found" });

  // "Similar" means the same kind of product (see productKind), so butter never shows milk.
  const kind = productKind(product.name);
  const headWord = product.name.trim().split(/\s+/)[0];
  const candidates = await prisma.product.findMany({
    where: {
      OR: [
        { id: product.id },
        ...(kind ? [{ name: { startsWith: headWord, mode: "insensitive" as const } }, ...(kind.startsWith("meat:") ? [{ category: "М'ясо" }] : [])] : [])
      ]
    },
    include: { prices: { where: { store: selectedStoresWhere(parseExcludedStores(req.query.excludeStores)) }, include: { store: true }, orderBy: { dateCollected: "desc" } } },
    orderBy: { name: "asc" }
  });

  const bestByStore = new Map<
    string,
    {
      price: (typeof candidates)[number]["prices"][number];
      product: (typeof candidates)[number];
      score: number;
      matchType: "exact" | "similar";
    }
  >();

  for (const candidate of candidates) {
    if (candidate.id !== product.id && productKind(candidate.name) !== kind) continue;
    const score = candidate.brand.toLowerCase() === product.brand.toLowerCase() ? 1 : 0;

    // An unconfirmed price of this very product stays visible (the app labels it);
    // a similar product is only worth showing with a confirmed price.
    for (const price of latestStorePrices(candidate.prices).filter((item) => item.isAvailable && (candidate.id === product.id || isPriceFresh(item.lastSeenAt)))) {
      const matchType = candidate.id === product.id ? "exact" : "similar";
      const previous = bestByStore.get(price.storeId);
      const currentActivePrice = activePrice(price);
      const previousActivePrice = previous ? activePrice(previous.price) : Number.POSITIVE_INFINITY;

      if (
        !previous ||
        (previous.matchType !== "exact" && matchType === "exact") ||
        (previous.matchType === matchType && score > previous.score) ||
        (previous.matchType === matchType && score === previous.score && currentActivePrice < previousActivePrice)
      ) {
        bestByStore.set(price.storeId, { price, product: candidate, score, matchType });
      }
    }
  }

  const rows = Array.from(bestByStore.values())
    .map(({ price, product: matchedProduct, matchType }) => ({
      id: price.id,
      productId: price.productId,
      storeId: price.storeId,
      price: toNumber(price.price),
      oldPrice: price.oldPrice ? toNumber(price.oldPrice) : null,
      discountPrice: price.discountPrice ? toNumber(price.discountPrice) : null,
      promoEndsAt: price.promoEndsAt,
      dateCollected: price.dateCollected,
      lastSeenAt: price.lastSeenAt,
      isAvailable: price.isAvailable,
      imageUrl: price.imageUrl,
      sourceUrl: price.sourceUrl,
      store: price.store,
      product: matchedProduct,
      matchType
    }))
    .sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));

  res.json(rows);
});

router.post("/", requireAdmin, async (req, res) => {
  const product = await prisma.product.create({ data: productSchema.parse(req.body) });
  res.status(201).json(product);
});

router.put("/:id", requireAdmin, async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: productSchema.partial().parse(req.body) });
  res.json(product);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get("/:id/alternatives", async (req, res) => {
  res.json(await getAlternatives(req.params.id, parseExcludedStores(req.query.excludeStores)));
});

export default router;
