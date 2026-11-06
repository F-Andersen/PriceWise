import { freshMeatMatch } from "../modules/priceMonitoring/freshMeatMatching";

/**
 * What kind of product this is, for suggesting a cheaper replacement. Two products
 * are interchangeable only if their kind keys are equal.
 *
 * The key is the first word of the name plus its lowercase descriptive words;
 * brands (capitalised words), flavours, fat %, weights and processing words are
 * ignored, known cheese varieties are kept. Examples:
 *   "Масло Roshen Селянське солодковершкове 82,5% 180г" → "масло солодковершкове"
 *   "Олія оливкова Metro Chef Extra Virgin 1л"           → "олія оливкова"
 *   "Молоко Яготинське безлактозне 2.5%"                 → "молоко безлактозне"
 *   "Сир Ферма Моцарелла 45% 180г"                       → "сир моцарелла"
 *   "Йогурт Дольче вишня 2,5% 290г"                      → "йогурт"
 * Fresh meat uses the stricter species + cut key (without brand).
 */

/** Words that describe how a product is processed or packed, not what it is. */
const IGNORED = new Set([
  "ультрапастеризоване", "ультрапастеризований", "ультрапастеризована", "пастеризоване", "пастеризований", "пастеризована",
  "охолоджене", "охолоджений", "охолоджена", "охолоджені", "нарізаний", "нарізана", "нарізане", "нарізка",
  "вищий", "вищого", "сорт", "сорту", "ваговий", "вагова", "вагове", "фасований", "фасована", "без", "з", "та", "і", "в", "у", "для",
  "шт", "г", "кг", "л", "мл", "см", "м", "стакан", "пляшка", "пачка"
]);

/** Flavours: a cherry and a peach yogurt are the same kind of product. */
const FLAVOURS = [
  "вишн", "персик", "полуниц", "ягід", "ягод", "малин", "чорниц", "банан", "ваніл", "шоколад", "какао", "карамел",
  "лайм", "м'ят", "лимон", "апельсин", "абрикос", "яблу", "груш", "манго", "кокос", "горіх", "лісов", "згущ"
];

/** Cheese and similar varieties are usually capitalised but define the product. */
const VARIETIES = [
  "гауда", "моцарелла", "сулугуні", "фелата", "фета", "бринза", "пармезан", "чеддер", "едам", "маасдам", "рікота", "камамбер", "брі",
  "філадельфія", "сервелат", "салямі", "докторська", "молочна", "прошуто", "хамон"
];

export function productKind(name: string): string | null {
  const meat = freshMeatMatch(name);
  if (meat) return `meat:${meat.species}:${meat.cut}:${meat.state}`; // brand does not change what the product is

  const words = name
    .replace(/[ʼ’]/g, "'")
    .replace(/[«»"(),.~/№]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;

  const [first, ...rest] = words;
  const head = first.toLowerCase();
  if (/^\d/.test(head) || /[a-z]/i.test(head)) return null;

  const descriptors = rest
    .filter((word) => {
      const lower = word.toLowerCase();
      if (/\d/.test(lower) || /[a-z]/i.test(lower)) return false; // sizes, %, Latin brands
      if (VARIETIES.includes(lower)) return true;
      if (word[0] !== word[0].toLowerCase()) return false; // capitalised: brand
      if (IGNORED.has(lower)) return false;
      if (FLAVOURS.some((stem) => lower.startsWith(stem))) return false;
      return lower.length > 1;
    })
    .map((word) => word.toLowerCase());

  return [head, ...[...new Set(descriptors)].sort()].join(" ");
}

export type Quantity = { amount: number; unit: "кг" | "л" | "шт" };

/**
 * Pack size from the product's volume field: "180 г" → 0.18 кг, "1.5 л" → 1.5 л,
 * "810 мл" → 0.81 л, "за 1 кг" → 1 кг (price is already per kg), "1 шт" → 1 шт.
 */
export function parseQuantity(volume: string | null | undefined): Quantity | null {
  // \b does not work after Cyrillic letters in JS, so check "no letter follows" explicitly.
  const match = (volume ?? "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(кг|г|л|мл|шт)(?!\p{L})/iu);
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

/** Price per kg / l / piece, or null if the pack size is unknown. */
export function unitPrice(packPrice: number, volume: string | null | undefined): { value: number; unit: Quantity["unit"] } | null {
  const quantity = parseQuantity(volume);
  if (!quantity) return null;
  return { value: Math.round((packPrice / quantity.amount) * 100) / 100, unit: quantity.unit };
}
