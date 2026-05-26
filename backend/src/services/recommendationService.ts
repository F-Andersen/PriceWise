import { prisma } from "../prisma";
import { activePrice, roundMoney, toNumber } from "../utils/money";

export async function getAlternatives(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  const currentMin = await getMinCurrentPrice(productId);
  if (!currentMin) return [];

  const candidates = await prisma.product.findMany({
    where: { category: product.category, id: { not: product.id } },
    include: { prices: { orderBy: { dateCollected: "desc" }, include: { store: true } } }
  });

  return candidates
    .map((candidate) => {
      const minPrice = latestMinPrice(candidate.prices);
      if (!minPrice || minPrice.value >= currentMin.value) return null;
      return {
        product: candidate,
        store: minPrice.store,
        price: minPrice.value,
        saveAmount: roundMoney(currentMin.value - minPrice.value)
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.saveAmount || 0) - (a?.saveAmount || 0))
    .slice(0, 5);
}

export async function getShoppingListRecommendations(shoppingListId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: shoppingListId },
    include: { items: { include: { product: true } } }
  });
  if (!list) throw new Error("Shopping list not found");

  const recommendations = [];
  for (const item of list.items) {
    const alternatives = await getAlternatives(item.productId);
    if (alternatives[0]) {
      recommendations.push({
        type: "alternative",
        message: `Можна замінити ${item.product.name} на ${alternatives[0].product.name} і зекономити ${roundMoney(alternatives[0].saveAmount * item.quantity)} грн`,
        product: item.product,
        alternative: alternatives[0].product,
        saveAmount: roundMoney(alternatives[0].saveAmount * item.quantity)
      });
    }

    const latestPrices = await prisma.price.findMany({
      where: { productId: item.productId },
      orderBy: { dateCollected: "desc" },
      take: 3,
      include: { store: true }
    });

    for (const price of latestPrices) {
      if (price.discountPrice) {
        recommendations.push({
          type: "discount",
          message: `${item.product.name} має акційну ціну в ${price.store.name}: ${toNumber(price.discountPrice)} грн`,
          product: item.product,
          store: price.store
        });
      }

      const since = new Date();
      since.setDate(since.getDate() - 30);
      const history = await prisma.price.findMany({
        where: { productId: item.productId, storeId: price.storeId, dateCollected: { gte: since } }
      });
      const average = history.reduce((sum, point) => sum + activePrice(point), 0) / Math.max(history.length, 1);
      if (activePrice(price) < average) {
        recommendations.push({
          type: "below_average",
          message: `${item.product.name} у ${price.store.name}: ціна нижча за середню за 30 днів`,
          product: item.product,
          store: price.store
        });
      }
    }
  }

  return recommendations.slice(0, 12);
}

async function getMinCurrentPrice(productId: string) {
  const prices = await prisma.price.findMany({
    where: { productId, isAvailable: true },
    orderBy: { dateCollected: "desc" },
    include: { store: true }
  });
  return latestMinPrice(prices);
}

function latestMinPrice(prices: Array<{ price: any; discountPrice: any; store: any; storeId: string }>) {
  const byStore = new Map<string, (typeof prices)[number]>();
  for (const price of prices) {
    if (!byStore.has(price.storeId)) byStore.set(price.storeId, price);
  }

  return Array.from(byStore.values())
    .map((price) => ({ store: price.store, value: activePrice(price) }))
    .sort((a, b) => a.value - b.value)[0];
}
