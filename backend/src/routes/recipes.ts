import { Router } from "express";
import { z } from "zod";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { getRecipe, listRecipes } from "../services/recipeService";
import { MAX_SERVINGS, MIN_SERVINGS } from "../services/recipePlanning";
import { parseExcludedStores } from "../utils/storeFilter";

const router = Router();

router.get("/", async (req, res) => {
  res.json(await listRecipes(parseExcludedStores(req.query.excludeStores)));
});

router.get("/:id", async (req, res) => {
  const recipe = await getRecipe(req.params.id, req.query.servings, parseExcludedStores(req.query.excludeStores));
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });
  res.json(recipe);
});

router.post("/:id/add-to-shopping-list", requireAuth, async (req: AuthRequest, res) => {
  const body = z
    .object({ shoppingListId: z.string().optional(), title: z.string().optional(), servings: z.number().int().min(MIN_SERVINGS).max(MAX_SERVINGS).optional() })
    .parse(req.body);
  const recipe = await getRecipe(req.params.id, body.servings, []);
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });

  const list = body.shoppingListId
    ? await prisma.shoppingList.findFirstOrThrow({ where: { id: body.shoppingListId, userId: req.userId } })
    : await prisma.shoppingList.create({ data: { title: body.title || recipe.title, userId: req.userId! } });

  // Optional ingredients stay the shopper's choice.
  for (const item of recipe.items) {
    if (item.optional || !item.product) continue;
    await prisma.shoppingListItem.upsert({
      where: { shoppingListId_productId: { shoppingListId: list.id, productId: item.product.id } },
      update: { quantity: { increment: item.quantity } },
      create: { shoppingListId: list.id, productId: item.product.id, quantity: item.quantity }
    });
  }

  res.json(await prisma.shoppingList.findUnique({ where: { id: list.id }, include: { items: { include: { product: true } } } }));
});

export default router;
