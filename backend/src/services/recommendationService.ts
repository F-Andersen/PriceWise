import { prisma } from "../prisma";
import { collectedStoresWhere } from "../modules/priceMonitoring/zakazStores";
import { isPriceFresh } from "../utils/freshness";
import { activePrice, hasActiveDiscount, roundMoney, toNumber } from "../utils/money";
import {
  MIN_SAVING_PERCENT,
  bestOffer,
  findAlternatives,
  periodsFromHistory,
  timeWeightedAverage,
  type LatestPrice,
  type ProductWithLatest
} from "./recommendations";

const DAY = 24 * 60 * 60 * 1000;

/** All products with their newest price row per collected store. */
async function catalogWithLatest() {
  const products = await prisma.product.findMany({
    include: {
      prices: { where: { store: collectedStoresWhere }, include: { store: true }, orderBy: [{ dateCollected: "desc" }, { id: "desc" }] }
    }
  });
  return products.map((product) => {
    const seen = new Set<string>();
    const latest: LatestPrice[] = [];
    for (const price of product.prices) {
      if (seen.has(price.storeId)) continue;
      seen.add(price.storeId);
      latest.push(price);
    }
    const { prices: _prices, ...rest } = product;
    return { product: rest, withLatest: { id: product.id, name: product.name, volume: product.volume, latest } satisfies ProductWithLatest };
  });
}

/** Cheaper products of the same kind, compared per kg / l / piece. */
export async function getAlternatives(productId: string) {
  const catalog = await catalogWithLatest();
  const target = catalog.find((entry) => entry.product.id === productId);
  if (!target) throw new Error("Product not found");

  const byId = new Map(catalog.map((entry) => [entry.product.id, entry.product]));
  return findAlternatives(target.withLatest, catalog.map((entry) => entry.withLatest)).map((alternative) => ({
    product: byId.get(alternative.productId)!,
    store: alternative.offer.store,
    packPrice: alternative.offer.packPrice,
    unitPrice: alternative.offer.unitPrice,
    unit: alternative.offer.unit,
    targetUnitPrice: alternative.targetUnitPrice,
    savingPercent: alternative.savingPercent
  }));
}

/**
 * Tips for a shopping list, at most one of each type per item:
 * - alternative: a cheaper product of the same kind, per unit;
 * - discount: the deepest running promotion for the item, with its end date;
 * - below_average: the cheapest current price is at least 5% under its own
 *   time-weighted 30-day average (needs a week of history).
 */
export async function getShoppingListRecommendations(shoppingListId: string) {
  const list = await prisma.shoppingList.findUnique({ where: { id: shoppingListId }, include: { items: true } });
  if (!list) throw new Error("Shopping list not found");
  if (!list.items.length) return [];

  const catalog = await catalogWithLatest();
  const byId = new Map(catalog.map((entry) => [entry.product.id, entry]));
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * DAY);
  const recommendations = [];

  for (const item of list.items) {
    const entry = byId.get(item.productId);
    if (!entry) continue;
    const product = entry.product;

    const [alternative] = findAlternatives(entry.withLatest, catalog.map((other) => other.withLatest), { now, limit: 1 });
    if (alternative) {
      const other = byId.get(alternative.productId)!.product;
      recommendations.push({
        type: "alternative",
        message: `${other.name} у ${alternative.offer.store.name} дешевший на ${alternative.savingPercent}% за ${alternative.offer.unit}, ніж ${product.name}`,
        product,
        alternative: other,
        store: alternative.offer.store,
        savingPercent: alternative.savingPercent,
        unit: alternative.offer.unit,
        unitPrice: alternative.offer.unitPrice,
        targetUnitPrice: alternative.targetUnitPrice
      });
    }

    const discounts = entry.withLatest.latest
      .filter((row) => row.isAvailable && isPriceFresh(row.lastSeenAt, now) && hasActiveDiscount(row, now) && row.oldPrice)
      .map((row) => {
        const price = activePrice(row, now);
        const oldPrice = toNumber(row.oldPrice);
        return { row, price, oldPrice, percent: Math.round(((oldPrice - price) / oldPrice) * 100) };
      })
      .sort((a, b) => b.percent - a.percent);
    if (discounts[0]) {
      const { row, price, oldPrice, percent } = discounts[0];
      recommendations.push({
        type: "discount",
        message: `${product.name}: акція в ${row.store.name}, ${roundMoney(price)} грн замість ${roundMoney(oldPrice)} грн (−${percent}%)`,
        product,
        store: row.store,
        price: roundMoney(price),
        oldPrice: roundMoney(oldPrice),
        discountPercent: percent,
        promoEndsAt: row.promoEndsAt
      });
    }

    const offer = bestOffer(entry.withLatest, now);
    if (offer) {
      const history = await prisma.price.findMany({
        where: { productId: product.id, storeId: offer.store.id, lastSeenAt: { gte: windowStart } },
        orderBy: { dateCollected: "asc" }
      });
      const average = timeWeightedAverage(
        periodsFromHistory(history.map((row) => ({ value: activePrice(row, row.dateCollected), dateCollected: row.dateCollected, lastSeenAt: row.lastSeenAt }))),
        windowStart,
        now
      );
      if (average && offer.packPrice <= average * (1 - MIN_SAVING_PERCENT / 100)) {
        const belowPercent = Math.round(((average - offer.packPrice) / average) * 100);
        recommendations.push({
          type: "below_average",
          message: `${product.name} у ${offer.store.name}: ${offer.packPrice} грн, на ${belowPercent}% нижче за середню ціну за 30 днів (${average} грн)`,
          product,
          store: offer.store,
          price: offer.packPrice,
          average,
          belowPercent
        });
      }
    }
  }

  return recommendations;
}
