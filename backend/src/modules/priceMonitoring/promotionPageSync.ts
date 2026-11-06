import { prisma } from "../../prisma";
import { roundMoney } from "../../utils/money";
import { classifyBarcode } from "./gtin";
import { BOT_HEADERS, REQUEST_DELAY_MS, ensureZakazStores, sleep, zakazStores } from "./zakazStores";

type PromotionSource = {
  storeName: string;
  url: string;
  host: string;
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

// Only zakaz.ua storefronts: their robots.txt allows promotion pages. АТБ returns
// 403 to bots, so it is no longer collected.
const promotionSources: PromotionSource[] = zakazStores.map((store) => ({
  storeName: store.name,
  url: `https://${store.host}/uk/custom-categories/promotions/`,
  host: store.host
}));

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

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: BOT_HEADERS
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/**
 * Finds the catalogue product for a promotion tile.
 * Global GTINs match across stores (in either 13- or 14-digit form). Store-internal
 * codes (weighed goods) only match the same store page; otherwise they get a
 * store-prefixed barcode so two stores' internal codes never merge into one product.
 */
async function resolveBarcode(product: ParsedPromotion, host: string) {
  const { kind, gtin14 } = classifyBarcode(product.barcode);
  if (kind === "global" && gtin14) {
    const variants = Array.from(new Set([product.barcode, gtin14, gtin14.replace(/^0/, "")]));
    const existing = await prisma.product.findFirst({ where: { barcode: { in: variants } } });
    return existing?.barcode ?? gtin14;
  }
  const source = await prisma.productSource.findUnique({ where: { sourceUrl: product.sourceUrl }, include: { product: true } });
  return source?.product.barcode ?? `${host}:${product.barcode}`;
}

async function upsertPromotion(product: ParsedPromotion, storeId: string, host: string) {
  const barcode = await resolveBarcode(product, host);
  const createdProduct = await prisma.product.upsert({
    where: { barcode },
    create: {
      name: product.name,
      brand: product.brand,
      category: product.category,
      barcode,
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
  // No price row here: the catalogue step right after this visits every product
  // (including the ones just added) and records the price with its promotion end
  // date, which promotion tiles do not show.
}

export async function syncPromotionPages(limitPerStore = 12) {
  const results = [];
  const stores = await ensureZakazStores();

  for (const [index, source] of promotionSources.entries()) {
    const store = stores.find(({ config }) => config.host === source.host)?.store;
    if (!store) {
      results.push({ store: source.storeName, url: source.url, status: "skipped", reason: "Store not found" });
      continue;
    }
    if (index > 0) await sleep(REQUEST_DELAY_MS);

    try {
      const html = await fetchHtml(source.url);
      const promotions = parseZakazPromotions(html, source.url, limitPerStore);

      for (const promotion of promotions) {
        await upsertPromotion(promotion, store.id, source.host);
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
