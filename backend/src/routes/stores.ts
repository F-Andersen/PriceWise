import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";
import { prisma } from "../prisma";
import { collectedStoresWhere } from "../modules/priceMonitoring/zakazStores";

const router = Router();
const storeSchema = z.object({
  name: z.string(),
  logoUrl: z.string().optional().nullable(),
  city: z.string(),
  sourceUrl: z.string().optional().nullable()
});

router.get("/", async (_req, res) => {
  // Only stores we collect prices from; АТБ, Сільпо etc. stay in the DB but are hidden.
  res.json(await prisma.store.findMany({ where: collectedStoresWhere, orderBy: { name: "asc" } }));
});

router.post("/", requireAdmin, async (req, res) => {
  const store = await prisma.store.create({ data: storeSchema.parse(req.body) });
  res.status(201).json(store);
});

export default router;
