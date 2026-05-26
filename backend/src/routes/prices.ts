import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { importMockPrices } from "../modules/priceImport/mockImporter";

const router = Router();
const priceSchema = z.object({
  productId: z.string(),
  storeId: z.string(),
  price: z.number(),
  oldPrice: z.number().optional().nullable(),
  discountPrice: z.number().optional().nullable(),
  dateCollected: z.coerce.date().optional(),
  isAvailable: z.boolean().optional()
});

router.get("/product/:productId", async (req, res) => {
  const prices = await prisma.price.findMany({
    where: { productId: req.params.productId },
    include: { store: true },
    orderBy: { dateCollected: "desc" }
  });
  res.json(prices);
});

router.get("/history/:productId", async (req, res) => {
  const prices = await prisma.price.findMany({
    where: { productId: req.params.productId },
    include: { store: true },
    orderBy: { dateCollected: "asc" }
  });
  res.json(prices);
});

router.post("/", async (req, res) => {
  const data = priceSchema.parse(req.body);
  const price = await prisma.price.create({ data: { ...data, dateCollected: data.dateCollected || new Date() } });
  res.status(201).json(price);
});

router.post("/import/mock", async (_req, res) => {
  res.json(await importMockPrices());
});

export default router;
