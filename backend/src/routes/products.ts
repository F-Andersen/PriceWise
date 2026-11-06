import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { getAlternatives } from "../services/recommendationService";
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

const stopWords = new Set([
  "для",
  "без",
  "за",
  "та",
  "або",
  "шт",
  "кг",
  "г",
  "л",
  "мл",
  "україна",
  "охолоджене",
  "охолоджений",
  "свіжий",
  "свіжа",
  "акційний",
  "акційна"
]);

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token) && !/^\d+$/.test(token));
}

function similarityScore(target: { id: string; name: string; brand: string; category: string }, candidate: { id: string; name: string; brand: string; category: string }) {
  if (target.id === candidate.id) return 100;
  if (target.category !== candidate.category) return -1;

  const targetTokens = new Set(tokens(`${target.name} ${target.brand}`));
  const candidateTokens = new Set(tokens(`${candidate.name} ${candidate.brand}`));
  let score = 0;

  for (const token of targetTokens) {
    if (candidateTokens.has(token)) score += 2;
  }

  if (target.brand && candidate.brand && target.brand.toLowerCase() === candidate.brand.toLowerCase()) score += 3;
  return score;
}

function latestStorePrices<T extends { storeId: string; dateCollected: Date }>(prices: T[]) {
  const map = new Map<string, T>();
  for (const price of prices.sort((a, b) => b.dateCollected.getTime() - a.dateCollected.getTime())) {
    if (!map.has(price.storeId)) map.set(price.storeId, price);
  }
  return Array.from(map.values());
}

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

router.get("/:id/market-prices", async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ message: "Product not found" });

  const candidates = await prisma.product.findMany({
    where: { category: product.category },
    include: { prices: { include: { store: true }, orderBy: { dateCollected: "desc" } } },
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
    const score = similarityScore(product, candidate);
    if (score < 0) continue;

    for (const price of latestStorePrices(candidate.prices).filter((item) => item.isAvailable)) {
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
      dateCollected: price.dateCollected,
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
