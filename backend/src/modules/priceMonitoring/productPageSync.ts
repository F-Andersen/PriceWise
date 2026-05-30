import { prisma } from "../../prisma";
import { roundMoney } from "../../utils/money";

type ParsedProductPage = {
  name?: string;
  imageUrl?: string;
  price?: number;
  oldPrice?: number;
  isAvailable?: boolean;
};

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
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

function extractProductImage(html: string) {
  const productSpecific = firstMatch(html, [
    /data-marker=["']Main_product_image["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /data-testid=["']product-image["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /<img[^>]+class=["'][^"']*(?:Product|product|Gallery|gallery)[^"']*["'][^>]+src=["']([^"']+)["']/i
  ]);
  if (productSpecific) return productSpecific;

  const imageCandidates = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi))
    .map((match) => decodeHtml(match[1] ?? ""))
    .filter((url) => /(img\d*\.zakaz\.ua|src\.zakaz\.atbmarket\.com)/i.test(url))
    .filter((url) => !/\.(svg|gif)(\?|$)/i.test(url));

  if (imageCandidates[0]) return imageCandidates[0];

  return firstMatch(html, [
    /"image"\s*:\s*\[\s*"([^"]+)"/i,
    /"image"\s*:\s*"([^"]+)"/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  ]);
}

export function parseProductPage(html: string): ParsedProductPage {
  const name = firstMatch(html, [
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  ]);

  const imageUrl = extractProductImage(html);

  const priceText = firstMatch(html, [
    /BigProductCardTopInfo__price[\s\S]*?Price__value_title[^>]*>([0-9]+(?:[.,][0-9]+)?)/i,
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /"price"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i
  ]);

  const oldPriceText = firstMatch(html, [
    /(?:oldPrice|old_price|priceOld|regularPrice)"?\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*<\/span>\s*<span[^>]*>₴[\s\S]{0,240}(?:discount|зниж|економ)/i
  ]);

  const stockLabel = firstMatch(html, [/data-testid=["']stock-balance-label["'][^>]*>([^<]+)<\/div>/i]);
  const isAvailable = stockLabel ? !/(немає|нет|закінчив|недоступ|out of stock)/i.test(stockLabel) : undefined;
  const price = parseNumber(priceText);
  const oldPrice = parseNumber(oldPriceText);
  const validOldPrice = oldPrice && price && oldPrice > price && oldPrice < price * 5 ? oldPrice : undefined;

  return { name, imageUrl, price, oldPrice: validOldPrice, isAvailable };
}

export async function syncProductPages(limit = 20) {
  const sources = await prisma.productSource.findMany({
    include: { product: true, store: true },
    orderBy: [{ product: { name: "asc" } }, { store: { name: "asc" } }]
  });

  const results = [];
  for (const source of sources.slice(0, limit)) {
    try {
      const response = await fetch(source.sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PriceWiseBot/0.1; +https://github.com/F-Andersen/PriceWise)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.6"
        }
      });

      if (!response.ok) {
        results.push({ url: source.sourceUrl, product: source.product.name, store: source.store.name, status: "failed", reason: String(response.status) });
        continue;
      }

      const parsed = parseProductPage(await response.text());
      if (!parsed.price) {
        results.push({ url: source.sourceUrl, product: source.product.name, store: source.store.name, status: "skipped", reason: "No price found" });
        continue;
      }

      const currentPrice = roundMoney(parsed.price);
      const oldPrice = parsed.oldPrice ? roundMoney(parsed.oldPrice) : null;
      const imageUrl = parsed.imageUrl ?? source.product.imageUrl ?? null;

      await prisma.price.create({
        data: {
          productId: source.productId,
          storeId: source.storeId,
          price: currentPrice,
          oldPrice,
          discountPrice: oldPrice && oldPrice > currentPrice ? currentPrice : null,
          dateCollected: new Date(),
          isAvailable: parsed.isAvailable ?? true,
          imageUrl,
          sourceUrl: source.sourceUrl
        }
      });

      if (parsed.imageUrl && parsed.imageUrl !== source.product.imageUrl) {
        await prisma.product.update({ where: { id: source.productId }, data: { imageUrl: parsed.imageUrl } });
      }

      results.push({ url: source.sourceUrl, product: source.product.name, store: source.store.name, status: "created", ...parsed });
    } catch (error) {
      results.push({ url: source.sourceUrl, product: source.product.name, store: source.store.name, status: "failed", reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return results;
}
