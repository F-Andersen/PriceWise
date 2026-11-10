import { Router } from "express";
import { z } from "zod";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { parseExcludedStores } from "../utils/storeFilter";
import { selectedStoresWhere } from "../modules/priceMonitoring/zakazStores";
import { compareShoppingList, planShoppingList } from "../services/comparisonService";
import { getShoppingListRecommendations } from "../services/recommendationService";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const lists = await prisma.shoppingList.findMany({
    where: { userId: req.userId },
    include: { items: { orderBy: { id: "asc" }, include: { product: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(lists);
});

router.post("/", async (req: AuthRequest, res) => {
  const body = z.object({ title: z.string().default("Мій список покупок") }).parse(req.body);
  const list = await prisma.shoppingList.create({ data: { title: body.title, userId: req.userId! }, include: { items: true } });
  res.status(201).json(list);
});

router.get("/:id", async (req: AuthRequest, res) => {
  const list = await prisma.shoppingList.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { items: { orderBy: { id: "asc" }, include: { product: { include: { prices: { where: { store: selectedStoresWhere(parseExcludedStores(req.query.excludeStores)) }, include: { store: true }, orderBy: { dateCollected: "desc" } } } } } } }
  });
  if (!list) return res.status(404).json({ message: "Shopping list not found" });
  res.json(list);
});

router.post("/:id/items", async (req: AuthRequest, res) => {
  const body = z.object({ productId: z.string(), quantity: z.number().int().positive().default(1) }).parse(req.body);
  await assertOwnsList(req.params.id, req.userId!);
  const item = await prisma.shoppingListItem.upsert({
    where: { shoppingListId_productId: { shoppingListId: req.params.id, productId: body.productId } },
    update: { quantity: { increment: body.quantity } },
    create: { shoppingListId: req.params.id, productId: body.productId, quantity: body.quantity },
    include: { product: true }
  });
  res.status(201).json(item);
});

router.put("/:id/items/:itemId", async (req: AuthRequest, res) => {
  const body = z.object({ quantity: z.number().int().positive() }).parse(req.body);
  await assertOwnsList(req.params.id, req.userId!);
  await assertItemInList(req.params.itemId, req.params.id);
  const item = await prisma.shoppingListItem.update({ where: { id: req.params.itemId }, data: { quantity: body.quantity }, include: { product: true } });
  res.json(item);
});

router.delete("/:id/items/:itemId", async (req: AuthRequest, res) => {
  await assertOwnsList(req.params.id, req.userId!);
  await assertItemInList(req.params.itemId, req.params.id);
  await prisma.shoppingListItem.delete({ where: { id: req.params.itemId } });
  res.status(204).send();
});

router.get("/:id/compare", async (req: AuthRequest, res) => {
  await assertOwnsList(req.params.id, req.userId!);
  res.json(await compareShoppingList(req.params.id, parseExcludedStores(req.query.excludeStores)));
});

router.get("/:id/plan", async (req: AuthRequest, res) => {
  await assertOwnsList(req.params.id, req.userId!);
  const cost = Number(req.query.extraStoreCost);
  const extraStoreCost = Number.isFinite(cost) && cost >= 0 ? Math.min(cost, 1000) : 0;
  res.json(await planShoppingList(req.params.id, parseExcludedStores(req.query.excludeStores), extraStoreCost));
});

router.get("/:id/recommendations", async (req: AuthRequest, res) => {
  await assertOwnsList(req.params.id, req.userId!);
  res.json(await getShoppingListRecommendations(req.params.id, parseExcludedStores(req.query.excludeStores)));
});

/** The item must belong to this (already owned) list, not to someone else's. */
async function assertItemInList(itemId: string, shoppingListId: string) {
  const item = await prisma.shoppingListItem.findFirst({ where: { id: itemId, shoppingListId } });
  if (!item) throw new Error("Shopping list item not found");
}

async function assertOwnsList(id: string, userId: string) {
  const list = await prisma.shoppingList.findFirst({ where: { id, userId } });
  if (!list) throw new Error("Shopping list not found");
}

export default router;
