import { prisma } from "../prisma";
import { selectedStoresWhere } from "../modules/priceMonitoring/zakazStores";
import { compareBaskets, type BasketComparison, type LatestPriceInput } from "./basketComparison";
import { optimizeBasket, type BasketPlanResult } from "./basketOptimizer";

/** A shopping list, the selected stores and the latest price of every item in every store. */
async function loadBasket(shoppingListId: string, excludedStoreIds: string[]) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: shoppingListId },
    include: { items: { include: { product: { select: { id: true, name: true } } } } }
  });
  if (!list) throw new Error("Shopping list not found");

  const stores = await prisma.store.findMany({ where: selectedStoresWhere(excludedStoreIds), orderBy: { name: "asc" } });
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

  return {
    items: list.items.map((item) => ({ productId: item.productId, productName: item.product.name, quantity: item.quantity })),
    stores,
    latestPrices: [...latest.values()]
  };
}

export async function compareShoppingList(shoppingListId: string, excludedStoreIds: string[] = []): Promise<BasketComparison> {
  return compareBaskets(await loadBasket(shoppingListId, excludedStoreIds));
}

/** The best way to split the list between stores, given what another store visit costs. */
export async function planShoppingList(shoppingListId: string, excludedStoreIds: string[] = [], extraStoreCost = 0): Promise<BasketPlanResult> {
  return optimizeBasket({ ...(await loadBasket(shoppingListId, excludedStoreIds)), extraStoreCost });
}
