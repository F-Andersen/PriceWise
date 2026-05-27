import { Router } from "express";
import { prisma } from "../prisma";
import { activePrice, roundMoney, toNumber } from "../utils/money";

const router = Router();

router.get("/", async (req, res) => {
  const storeId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;

  const prices = await prisma.price.findMany({
    where: {
      isAvailable: true,
      storeId,
      OR: [{ discountPrice: { not: null } }, { oldPrice: { not: null } }]
    },
    include: { product: true, store: true },
    orderBy: { dateCollected: "desc" },
    take: 80
  });

  const latestByProductStore = new Map<string, (typeof prices)[number]>();
  for (const price of prices) {
    const key = `${price.productId}:${price.storeId}`;
    if (!latestByProductStore.has(key)) latestByProductStore.set(key, price);
  }

  const offers = Array.from(latestByProductStore.values())
    .map((price) => {
      const currentPrice = activePrice(price);
      const oldPrice = toNumber(price.oldPrice ?? price.price);
      const saveAmount = Math.max(0, oldPrice - currentPrice);
      const discountPercent = oldPrice > 0 ? Math.round((saveAmount / oldPrice) * 100) : 0;

      return {
        id: price.id,
        product: price.product,
        store: price.store,
        imageUrl: price.imageUrl ?? price.product.imageUrl,
        price: roundMoney(currentPrice),
        oldPrice: roundMoney(oldPrice),
        saveAmount: roundMoney(saveAmount),
        discountPercent,
        dateCollected: price.dateCollected,
        label: price.discountPrice ? "Акція" : "Спецпропозиція"
      };
    })
    .filter((offer) => offer.saveAmount > 0)
    .sort((a, b) => b.discountPercent - a.discountPercent);

  res.json(offers);
});

export default router;
