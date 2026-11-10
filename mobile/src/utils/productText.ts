import { formatPrice } from "./prices";

type Quantity = { amount: number; unit: "кг" | "л" | "шт" };

/** Розмір упаковки з поля volume: те саме правило, що parseQuantity на сервері. */
export function parseQuantity(volume: string | null | undefined): Quantity | null {
  // \b не працює після кирилиці, тому окремо перевіряємо, що далі немає літери.
  const match = (volume ?? "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(кг|г|л|мл|шт)(?![а-яіїєґa-z])/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  switch (match[2].toLowerCase()) {
    case "кг": return { amount: value, unit: "кг" };
    case "г": return { amount: value / 1000, unit: "кг" };
    case "л": return { amount: value, unit: "л" };
    case "мл": return { amount: value / 1000, unit: "л" };
    default: return { amount: value, unit: "шт" };
  }
}

/** «255 грн/кг». Для упаковки на одну одиницю ціна вже є ціною за одиницю, тому null. */
export function unitPriceLabel(packPrice: number, volume: string | null | undefined) {
  const quantity = parseQuantity(volume);
  if (!quantity || quantity.amount === 1) return null;
  return `${formatPrice(Math.round((packPrice / quantity.amount) * 100) / 100)}/${quantity.unit}`;
}

/** «1.5 л» → «1,5 л». */
export function volumeLabel(volume: string | null | undefined) {
  return (volume ?? "").trim().replace(".", ",");
}

const bare = (word: string) => word.toLowerCase().replace(/[«»"'’ʼ(),]/g, "");
const PACK_SIZE_AT_END = /^\d+(?:[.,]\d+)?(?:кг|г|л|мл|шт)\.?$/i;

/**
 * Бренд окремо від назви. У базі поле brand часто хибне («Ковбаса», «газований», «без тм»),
 * тому брендом вважаємо лише слово з великої літери, яке стоїть у назві не першим.
 * Розмір упаковки в кінці назви прибираємо: його показує мітка на фото.
 */
export function productTitle(product: { name: string; brand?: string | null }) {
  const words = product.name.trim().split(/\s+/);
  if (words.length > 1 && PACK_SIZE_AT_END.test(words[words.length - 1])) words.pop();

  const brand = (product.brand ?? "").trim();
  const brandWords = brand.split(/\s+/).map(bare);
  const start = brand && brand[0] === brand[0].toUpperCase() && brand[0] !== brand[0].toLowerCase()
    ? words.findIndex((_, index) => index > 0 && brandWords.every((word, offset) => bare(words[index + offset] ?? "") === word))
    : -1;
  if (start < 0) return { brand: null, name: words.join(" ") };

  words.splice(start, brandWords.length);
  return { brand, name: words.join(" ") };
}
