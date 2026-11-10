import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../prisma";
import { chunk } from "../utils/chunk";
import { hasMorePages, parsePagination } from "../utils/pagination";
import { parseExcludedStores } from "../utils/storeFilter";
import { zakazStores } from "../modules/priceMonitoring/zakazStores";
import { matchesOfferQuery } from "../services/offerSearch";
import { isPriceFresh } from "../utils/freshness";
import { activePrice, hasActiveDiscount, roundMoney, toNumber } from "../utils/money";

const router = Router();

/** PostgreSQL accepts 32767 parameters per query; stay well below it. */
const PRICE_ID_BATCH = 10_000;

/**
 * Discounted rows among the latest price per product and store. Offers must be
 * decided on the latest row: filtering by "has a discount" first would resurrect a
 * promotion that ended, because its old discounted row would still be the newest
 * discounted one. The filter runs here so the list stays limited to real offers.
 */
async function latestDiscountedPriceIds(excludedIds: string[]) {
  const storeNames = zakazStores.map((store) => store.name);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT latest.id
    FROM (
      SELECT DISTINCT ON (p."productId", p."storeId") p.id, p."isAvailable", p."discountPrice"
      FROM "Price" p
      JOIN "Store" s ON s.id = p."storeId"
      WHERE s.name IN (${Prisma.join(storeNames)})
        ${excludedIds.length ? Prisma.sql`AND p."storeId" NOT IN (${Prisma.join(excludedIds)})` : Prisma.empty}
      ORDER BY p."productId", p."storeId", p."dateCollected" DESC, p.id DESC
    ) latest
    WHERE latest."isAvailable" AND latest."discountPrice" IS NOT NULL
  `);
  return rows.map((row) => row.id);
}

async function loadOfferPrices(ids: string[]) {
  const prices = [];
  for (const batch of chunk(ids, PRICE_ID_BATCH)) {
    prices.push(...(await prisma.price.findMany({ where: { id: { in: batch } }, include: { product: true, store: true } })));
  }
  return prices;
}

router.get("/", async (req, res) => {
  const storeId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;
  const query = typeof req.query.query === "string" ? req.query.query.slice(0, 100) : "";
  const now = new Date();

  // Every store's offers, so the counts on the store filter stay complete.
  const latest = await loadOfferPrices(await latestDiscountedPriceIds(parseExcludedStores(req.query.excludeStores)));

  const offers = latest
    .filter((price) => hasActiveDiscount(price, now) && isPriceFresh(price.lastSeenAt, now))
    .map((price) => {
      const currentPrice = activePrice(price, now);
      const oldPrice = toNumber(price.oldPrice ?? price.price);
      const saveAmount = Math.max(0, oldPrice - currentPrice);
      const discountPercent = oldPrice > 0 ? Math.round((saveAmount / oldPrice) * 100) : 0;

      return {
        id: price.id,
        product: price.product,
        store: price.store,
        imageUrl: price.imageUrl ?? price.product.imageUrl,
        sourceUrl: price.sourceUrl,
        price: roundMoney(currentPrice),
        oldPrice: roundMoney(oldPrice),
        saveAmount: roundMoney(saveAmount),
        discountPercent,
        dateCollected: price.dateCollected,
        lastSeenAt: price.lastSeenAt,
        promoEndsAt: price.promoEndsAt,
        label: "Акція"
      };
    })
    .filter((offer) => offer.saveAmount > 0)
    .sort((a, b) => b.discountPercent - a.discountPercent || a.id.localeCompare(b.id));

  // Store counts follow the search, so each chip says what it would show.
  const found = offers.filter((offer) => matchesOfferQuery(offer, query));
  const counts = new Map<string, number>();
  for (const offer of found) counts.set(offer.store.id, (counts.get(offer.store.id) ?? 0) + 1);

  const { page, limit, skip } = parsePagination(req.query);
  const matching = storeId ? found.filter((offer) => offer.store.id === storeId) : found;
  const items = matching.slice(skip, skip + limit);
  res.json({
    items,
    total: matching.length,
    page,
    limit,
    hasMore: hasMorePages(skip, items.length, matching.length),
    stores: [...counts].map(([id, count]) => ({ storeId: id, count })),
    latestCheckedAt: offers.reduce<Date | null>((latest, offer) => (!latest || offer.lastSeenAt > latest ? offer.lastSeenAt : latest), null)
  });
});

export default router;
