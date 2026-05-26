import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

const router = Router();
const storeSchema = z.object({
  name: z.string(),
  logoUrl: z.string().optional().nullable(),
  city: z.string(),
  sourceUrl: z.string().optional().nullable()
});

router.get("/", async (_req, res) => {
  res.json(await prisma.store.findMany({ orderBy: { name: "asc" } }));
});

router.post("/", async (req, res) => {
  const store = await prisma.store.create({ data: storeSchema.parse(req.body) });
  res.status(201).json(store);
});

export default router;
