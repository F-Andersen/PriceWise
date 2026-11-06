import { prisma } from "../prisma";
import { collectedStoresWhere } from "../modules/priceMonitoring/zakazStores";
import { compareBaskets, type BasketComparison, type LatestPriceInput } from "./basketComparison";

/**
 * Loads a shopping list, the stores we collect from and the latest price of every
 * list item in every store, then applies the comparison rules in basketComparison.ts.
 */
export async function compareShoppingList(shoppingListId: string): Promise<BasketComparison> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: shoppingListId },
    include: { items: { include: { product: { select: { id: true, name: true } } } } }
  });
  if (!list) throw new Error("Shopping list not found");

  const stores = await prisma.store.findMany({ where: collectedStoresWhere, orderBy: { name: "asc" } });
  const productIds = list.items.map((item) => item.productId);

  // Newest row first; the first row seen per product and store is its latest price.
  const rows = productIds.length
    ? await prisma.price.findMany({
        where: { productId: { in: productIds }, storeId: { in: stores.map((store) => store.id) } },
        orderBy: [{ dateCollected: "desc" }, { id: "desc" }]
      })
    : [];
  const latest = new Map<string, LatestPriceInput>();
  for (const row of rows) {
    const key = `${row.productId}:${row.storeId}`;
    if (!latest.has(key)) latest.set(key, row);
  }

  return compareBaskets({
    items: list.items.map((item) => ({ productId: item.productId, productName: item.product.name, quantity: item.quantity })),
    stores,
    latestPrices: [...latest.values()]
  });
}
