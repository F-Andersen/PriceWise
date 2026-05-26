import { Router } from "express";
import { z } from "zod";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  res.json(await prisma.recipe.findMany({ include: { items: { include: { product: true } } }, orderBy: { title: "asc" } }));
});

router.get("/:id", async (req, res) => {
  const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id }, include: { items: { include: { product: true } } } });
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });
  res.json(recipe);
});

router.post("/:id/add-to-shopping-list", requireAuth, async (req: AuthRequest, res) => {
  const body = z.object({ shoppingListId: z.string().optional(), title: z.string().optional() }).parse(req.body);
  const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });

  const list =
    body.shoppingListId
      ? await prisma.shoppingList.findFirstOrThrow({ where: { id: body.shoppingListId, userId: req.userId } })
      : await prisma.shoppingList.create({ data: { title: body.title || recipe.title, userId: req.userId! } });

  for (const item of recipe.items) {
    await prisma.shoppingListItem.upsert({
      where: { shoppingListId_productId: { shoppingListId: list.id, productId: item.productId } },
      update: { quantity: { increment: item.quantity } },
      create: { shoppingListId: list.id, productId: item.productId, quantity: item.quantity }
    });
  }

  res.json(await prisma.shoppingList.findUnique({ where: { id: list.id }, include: { items: { include: { product: true } } } }));
});

export default router;
