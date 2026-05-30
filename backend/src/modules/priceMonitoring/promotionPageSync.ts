import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { roundMoney } from "../../utils/money";

type PromotionSource = {
  storeName: string;
  url: string;
  kind: "zakaz" | "atb";
};

type ParsedPromotion = {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  unit: string;
  volume: string;
  imageUrl: string;
  sourceUrl: string;
  price: number;
  oldPrice: number;
};

const promotionSources: PromotionSource[] = [
  { storeName: "Novus", url: "https://novus.zakaz.ua/uk/promotions/", kind: "zakaz" },
  { storeName: "METRO", url: "https://metro.zakaz.ua/uk/promotions/", kind: "zakaz" },
  { storeName: "Ашан", url: "https://auchan.zakaz.ua/uk/promotions/", kind: "zakaz" },
  { storeName: "АТБ", url: "https://www.atbmarket.com/promo/economy", kind: "atb" }
];

const blockedProductWords = [
  "алкоголь",
  "вино",
  "горіл",
  "коньяк",
  "віскі",
  "бренді",
  "пиво",
  "сидр",
  "ром ",
  "джин",
  "тютюн"
];

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

function getAttr(attrs: string, name: string) {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, "i");
  const match = attrs.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : undefined;
}

function firstMatch(value: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = value.match(pattern);
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

function absoluteUrl(path: string, baseUrl: string) {
  return new URL(path, baseUrl).toString();
}

function largeZakazImage(url: string) {
  return url.replace(/-s\d+x\d+(\.[a-z]+)$/i, "-s350x350$1");
}

function categoryFromName(name: string) {
  const normalized = name.toLowerCase();
  if (/(молоко|йогурт|кефір|сир|сметан|масло|вершк)/i.test(normalized)) return "Молочні продукти";
  if (/(хліб|батон|лаваш|булоч|випіч|пиріг)/i.test(normalized)) return "Хліб";
  if (/(кур|філе|фарш|ковбас|сосиск|м'яс|м’яс|стейк)/i.test(normalized)) return "М'ясо";
  if (/(капуст|огір|томат|перець|моркв|буряк|картоп|редис|зелень|рукол)/i.test(normalized)) return "Овочі";
  if (/(яблук|банан|апельсин|мандарин|авокадо|лимон|лайм|ягод|полуниц)/i.test(normalized)) return "Фрукти";
  if (/(греч|рис|булгур|круп|пластів|борошн|макарон|олія)/i.test(normalized)) return "Крупи";
  if (/(вода|сік|напій|кола|квас|чай|кава)/i.test(normalized)) return "Напої";
  if (/(порош|гель|мило|шампун|засіб|сервет|паста зуб|щітка)/i.test(normalized)) return "Побутова хімія";
  return "Акційні товари";
}

function brandFromName(name: string) {
  const words = name
    .replace(/[«»"(),.%]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const ignored = new Set(["молоко", "йогурт", "кефір", "сир", "вода", "хліб", "батон", "крупа", "напій", "курка", "філе"]);
  const candidate = words.find((word) => !ignored.has(word.toLowerCase()));
  return candidate ?? "Без бренду";
}

function isAllowedProduct(name: string) {
  const normalized = name.toLowerCase();
  return !blockedProductWords.some((word) => normalized.includes(word));
}

function compactBarcode(raw: string, sourceUrl: string) {
  const clean = raw.replace(/\D/g, "");
  if (clean.length >= 6) return clean;
  return `source-${Buffer.from(sourceUrl).toString("base64url").slice(0, 24)}`;
}

function parseZakazPromotions(html: string, baseUrl: string, limit: number): ParsedPromotion[] {
  const promotions: ParsedPromotion[] = [];
  const tileRegex = /<a\b(?=[^>]*data-testid=["']product-tile["'])([^>]*)>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = tileRegex.exec(html)) && promotions.length < limit) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const href = getAttr(attrs, "href");
    const rawTitle = getAttr(attrs, "title") ?? firstMatch(body, [/data-testid=["']product_tile_title["'][^>]*>([^<]+)</i]);
    const rawBarcode = getAttr(attrs, "data-productkey");
    const imageUrl = firstMatch(body, [/<img[^>]+src=["']([^"']+)["']/i]);
    const oldPrice = parseNumber(firstMatch(body, [/data-marker=["']Old Price["'][\s\S]*?Price__value[^>]*>([0-9]+(?:[.,][0-9]+)?)/i]));
    const discountPrice = parseNumber(firstMatch(body, [/data-marker=["']Discounted Price["'][\s\S]*?Price__value[^>]*>([0-9]+(?:[.,][0-9]+)?)/i]));
    const volume = firstMatch(body, [/data-testid=["']productTileWeight["'][^>]*>([^<]+)</i]) ?? "1 шт";

    if (!href || !rawTitle || !rawBarcode || !imageUrl || !oldPrice || !discountPrice || discountPrice >= oldPrice) continue;
    if (!isAllowedProduct(rawTitle)) continue;

    const sourceUrl = absoluteUrl(href, baseUrl);
    promotions.push({
      name: rawTitle,
      brand: brandFromName(rawTitle),
      category: categoryFromName(rawTitle),
      barcode: compactBarcode(rawBarcode, sourceUrl),
      unit: "шт",
      volume,
      imageUrl: largeZakazImage(imageUrl),
      sourceUrl,
      price: roundMoney(discountPrice),
      oldPrice: roundMoney(oldPrice)
    });
  }

  return promotions;
}

function parseAtbPromotions(html: string, baseUrl: string, limit: number): ParsedPromotion[] {
  const promotions: ParsedPromotion[] = [];
  const cardRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;

  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(html)) && promotions.length < limit) {
    const body = match[1] ?? "";
    const href = firstMatch(body, [/<a[^>]+href=["']([^"']*\/product\/[^"']+)["']/i]);
    const name = firstMatch(body, [
      /<a[^>]+href=["'][^"']*\/product\/[^"']+["'][^>]*>([^<]{8,})</i,
      /<img[^>]+alt=["']([^"']+)["']/i
    ]);
    const imageUrl = firstMatch(body, [/<img[^>]+src=["']([^"']+)["']/i]);
    const current = parseNumber(firstMatch(body, [/([0-9]+(?:[.,][0-9]+)?)\s*грн\/шт/i]));
    const oldPrice = parseNumber(firstMatch(body, [/грн\/шт[\s\S]{0,160}?([0-9]+(?:[.,][0-9]+)?)/i]));

    if (!href || !name || !imageUrl || !current || !oldPrice || current >= oldPrice) continue;
    if (!isAllowedProduct(name)) continue;

    const sourceUrl = absoluteUrl(href, baseUrl);
    promotions.push({
      name,
      brand: brandFromName(name),
      category: categoryFromName(name),
      barcode: compactBarcode(sourceUrl, sourceUrl),
      unit: "шт",
      volume: "1 шт",
      imageUrl: absoluteUrl(imageUrl, baseUrl),
      sourceUrl,
      price: roundMoney(current),
      oldPrice: roundMoney(oldPrice)
    });
  }

  return promotions;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PriceWiseBot/0.1; +https://github.com/F-Andersen/PriceWise)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.6"
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function upsertPromotion(product: ParsedPromotion, storeId: string) {
  const createdProduct = await prisma.product.upsert({
    where: { barcode: product.barcode },
    create: {
      name: product.name,
      brand: product.brand,
      category: product.category,
      barcode: product.barcode,
      unit: product.unit,
      volume: product.volume,
      imageUrl: product.imageUrl,
      description: `Акційний товар, імпортований з ${product.sourceUrl}`
    },
    update: {
      name: product.name,
      brand: product.brand,
      category: product.category,
      unit: product.unit,
      volume: product.volume,
      imageUrl: product.imageUrl,
      description: `Акційний товар, імпортований з ${product.sourceUrl}`
    }
  });

  await prisma.productSource.upsert({
    where: { sourceUrl: product.sourceUrl },
    create: {
      productId: createdProduct.id,
      storeId,
      sourceUrl: product.sourceUrl
    },
    update: {
      productId: createdProduct.id,
      storeId
    }
  });

  await prisma.price.create({
    data: {
      productId: createdProduct.id,
      storeId,
      price: new Prisma.Decimal(product.oldPrice),
      oldPrice: new Prisma.Decimal(product.oldPrice),
      discountPrice: new Prisma.Decimal(product.price),
      dateCollected: new Date(),
      isAvailable: true,
      imageUrl: product.imageUrl,
      sourceUrl: product.sourceUrl
    }
  });
}

export async function syncPromotionPages(limitPerStore = 12) {
  const results = [];

  for (const source of promotionSources) {
    const store = await prisma.store.findFirst({ where: { name: source.storeName } });
    if (!store) {
      results.push({ store: source.storeName, url: source.url, status: "skipped", reason: "Store not found" });
      continue;
    }

    try {
      const html = await fetchHtml(source.url);
      const promotions =
        source.kind === "zakaz"
          ? parseZakazPromotions(html, source.url, limitPerStore)
          : parseAtbPromotions(html, source.url, limitPerStore);

      for (const promotion of promotions) {
        await upsertPromotion(promotion, store.id);
      }

      results.push({ store: source.storeName, url: source.url, status: "created", count: promotions.length });
    } catch (error) {
      results.push({
        store: source.storeName,
        url: source.url,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return results;
}
