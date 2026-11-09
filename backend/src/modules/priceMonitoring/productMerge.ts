import type { Prisma } from "@prisma/client";

/**
 * Moves everything attached to `otherId` onto `targetId` and deletes `otherId`.
 * The two products must not share a store: a product has one source per store.
 */
export async function moveProductData(tx: Prisma.TransactionClient, targetId: string, otherId: string) {
  await tx.productSource.updateMany({ where: { productId: otherId }, data: { productId: targetId } });
  await tx.price.updateMany({ where: { productId: otherId }, data: { productId: targetId } });
  await tx.recipeItem.updateMany({ where: { productId: otherId }, data: { productId: targetId } });

  // A shopping list may already contain the target: add the quantities up.
  for (const item of await tx.shoppingListItem.findMany({ where: { productId: otherId } })) {
    const existing = await tx.shoppingListItem.findUnique({
      where: { shoppingListId_productId: { shoppingListId: item.shoppingListId, productId: targetId } }
    });
    if (existing) {
      await tx.shoppingListItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + item.quantity } });
      await tx.shoppingListItem.delete({ where: { id: item.id } });
    } else {
      await tx.shoppingListItem.update({ where: { id: item.id }, data: { productId: targetId } });
    }
  }
  await tx.product.delete({ where: { id: otherId } });
}
