import { prisma } from "../../prisma";
import { roundMoney } from "../../utils/money";

type ParsedProductPage = {
  imageUrl?: string;
  price?: number;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstMatch(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return undefined;
}

function parseNumber(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseProductPage(html: string): ParsedProductPage {
  const imageUrl = firstMatch(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /"image"\s*:\s*"([^"]+)"/i,
    /"image"\s*:\s*\[\s*"([^"]+)"/i
  ]);

  const priceText = firstMatch(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /"price"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i
  ]);

  return { imageUrl, price: parseNumber(priceText) };
}

export async function syncProductPages(limit = 20) {
  const prices = await prisma.price.findMany({
    where: { sourceUrl: { not: null } },
    include: { product: true, store: true },
    orderBy: { dateCollected: "desc" },
  });

  const results = [];
  const latestByProductStore = new Map<string, (typeof prices)[number]>();
  for (const price of prices) {
    const key = `${price.productId}:${price.storeId}`;
    if (!latestByProductStore.has(key)) latestByProductStore.set(key, price);
  }

  for (const price of Array.from(latestByProductStore.values()).slice(0, limit)) {
    if (!price.sourceUrl) continue;

    try {
      const response = await fetch(price.sourceUrl, {
        headers: {
          "User-Agent": "PriceWiseBot/0.1 (+https://github.com/F-Andersen/PriceWise)",
          Accept: "text/html,application/xhtml+xml"
        }
      });

      if (!response.ok) {
        results.push({ url: price.sourceUrl, store: price.store.name, status: "failed", reason: String(response.status) });
        continue;
      }

      const parsed = parseProductPage(await response.text());
      const data = {
        ...(parsed.imageUrl ? { imageUrl: parsed.imageUrl } : {}),
        ...(parsed.price ? { price: roundMoney(parsed.price) } : {})
      };

      if (Object.keys(data).length) {
        await prisma.price.update({ where: { id: price.id }, data });
        if (parsed.imageUrl) {
          await prisma.price.updateMany({ where: { sourceUrl: price.sourceUrl }, data: { imageUrl: parsed.imageUrl } });
          await prisma.product.update({ where: { id: price.productId }, data: { imageUrl: parsed.imageUrl } });
        }
      }

      results.push({ url: price.sourceUrl, store: price.store.name, status: "updated", ...parsed });
    } catch (error) {
      results.push({ url: price.sourceUrl, store: price.store.name, status: "failed", reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return results;
}
