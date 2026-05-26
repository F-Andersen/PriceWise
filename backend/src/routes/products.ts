import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { getAlternatives } from "../services/recommendationService";

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

router.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({
    include: { prices: { include: { store: true }, orderBy: { dateCollected: "desc" } } },
    orderBy: { name: "asc" }
  });
  res.json(products);
});

router.get("/search", async (req, res) => {
  const query = String(req.query.query || "").trim();
  const products = await prisma.product.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: { prices: { include: { store: true }, orderBy: { dateCollected: "desc" } } },
    orderBy: { name: "asc" }
  });
  res.json(products);
});

router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { prices: { include: { store: true }, orderBy: { dateCollected: "desc" } } }
  });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

router.post("/", async (req, res) => {
  const product = await prisma.product.create({ data: productSchema.parse(req.body) });
  res.status(201).json(product);
});

router.put("/:id", async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: productSchema.partial().parse(req.body) });
  res.json(product);
});

router.delete("/:id", async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get("/:id/alternatives", async (req, res) => {
  res.json(await getAlternatives(req.params.id));
});

export default router;
