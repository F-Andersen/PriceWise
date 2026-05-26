import { prisma } from "../prisma";
import { activePrice, roundMoney } from "../utils/money";

export async function compareShoppingList(shoppingListId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: shoppingListId },
    include: { items: { include: { product: true } } }
  });

  if (!list) throw new Error("Shopping list not found");

  const stores = await prisma.store.findMany({ orderBy: { name: "asc" } });
  const results = await Promise.all(
    stores.map(async (store) => {
      let totalPrice = 0;
      const missingProducts: string[] = [];
      const foundItems = [];

      for (const item of list.items) {
        const latest = await prisma.price.findFirst({
          where: { productId: item.productId, storeId: store.id },
          orderBy: { dateCollected: "desc" }
        });

        if (!latest?.isAvailable) {
          missingProducts.push(item.product.name);
          continue;
        }

        const unitPrice = activePrice(latest);
        const lineTotal = unitPrice * item.quantity;
        totalPrice += lineTotal;
        foundItems.push({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: roundMoney(unitPrice),
          lineTotal: roundMoney(lineTotal),
          hasDiscount: Boolean(latest.discountPrice)
        });
      }

      return {
        store,
        totalPrice: roundMoney(totalPrice),
        foundCount: foundItems.length,
        missingCount: missingProducts.length,
        missingProducts,
        items: foundItems,
        difference: 0,
        isBest: false
      };
    })
  );

  const completeOrAny = results.filter((result) => result.foundCount > 0);
  const bestTotal = Math.min(...completeOrAny.map((result) => result.totalPrice));

  return results
    .map((result) => ({
      ...result,
      difference: roundMoney(result.totalPrice - bestTotal),
      isBest: result.totalPrice === bestTotal
    }))
    .sort((a, b) => a.totalPrice - b.totalPrice);
}
