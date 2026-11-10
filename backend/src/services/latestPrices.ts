import { selectedStoresWhere } from "../modules/priceMonitoring/zakazStores";

/** Newest row per store: enough for lists, and far smaller than the whole history. */
export const latestPricesInclude = (excludedStoreIds: string[]) => ({
  prices: {
    where: { store: selectedStoresWhere(excludedStoreIds) },
    include: { store: true },
    orderBy: [{ dateCollected: "desc" as const }, { id: "desc" as const }],
    distinct: ["storeId" as const]
  }
});
