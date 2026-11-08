import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../prisma";
import { zakazStores } from "../modules/priceMonitoring/zakazStores";
import { isPriceFresh } from "../utils/freshness";
import { activePrice, hasActiveDiscount, roundMoney, toNumber } from "../utils/money";

const router = Router();

/**
 * Latest price row per product and store. Offers must be decided on this row:
 * filtering by "has a discount" first would resurrect a promotion that ended,
 * because its old discounted row would still be the newest discounted one.
 */
async function latestPriceIds(storeId?: string) {
  const storeNames = zakazStores.map((store) => store.name);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT DISTINCT ON (p."productId", p."storeId") p.id
    FROM "Price" p
    JOIN "Store" s ON s.id = p."storeId"
    WHERE s.name IN (${Prisma.join(storeNames)})
      ${storeId ? Prisma.sql`AND p."storeId" = ${storeId}` : Prisma.empty}
    ORDER BY p."productId", p."storeId", p."dateCollected" DESC, p.id DESC
  `);
  return rows.map((row) => row.id);
}

router.get("/", async (req, res) => {
  const storeId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;
  const now = new Date();

  const latest = await prisma.price.findMany({
    where: { id: { in: await latestPriceIds(storeId) }, isAvailable: true, discountPrice: { not: null } },
    include: { product: true, store: true }
  });

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
    .sort((a, b) => b.discountPercent - a.discountPercent);

  res.json(offers);
});

export default router;
