import type { Product } from "@prisma/client";
import { prisma } from "../../prisma";
import { freshMeatMatch } from "./freshMeatMatching";
import { classifyBarcode } from "./gtin";
import { moveProductData } from "./productMerge";

/**
 * Loose fruit and vegetables sold by weight have no global barcode: every store
 * gives them its own internal code, so barcode matching leaves "Капуста цвітна"
 * as three separate products. This step merges such products across stores.
 *
 * The rule is deliberately narrow, to avoid false matches like "yogurt = milk":
 * - only products without a global GTIN, sold per kg ("за 1 кг");
 * - the first word must be a known fresh produce noun (list below);
 * - no Latin letters in the name (store brands like "Metro Chef");
 * - the rest of the name must match exactly, ignoring word order, country of
 *   origin and filler words. Varieties stay apart: "Картопля рожева" ≠ "Картопля";
 * - a group with two products from the same store is ambiguous and is skipped.
 * Fresh meat on the counter uses a stricter rule (species + cut + state + brand),
 * see freshMeatMatching.ts.
 */
const PRODUCE_STEMS = [
  "авокадо", "апельсин", "банан", "броколі", "буряк", "виноград", "гарбуз", "грейпфрут", "груш",
  "кабач", "капуст", "картопл", "ківі", "лайм", "лимон", "мандарин", "морк", "нектарин", "огір",
  "перець", "персик", "помідор", "томат", "редис", "редьк", "селер", "слив", "часник", "цибул",
  "яблу", "баклажан", "кукурудз", "імбир", "гранат", "хурм"
];

const COUNTRIES = [
  "україна", "україни", "туреччина", "туреччини", "іспанія", "іспанії", "польща", "польщі", "єгипет", "єгипту",
  "італія", "італії", "греція", "греції", "марокко", "еквадор", "перу", "китай", "ізраїль",
  "нідерланди", "молдова", "молдови", "грузія", "узбекистан", "азербайджан", "імпорт", "імпортний", "імпортна"
];

const FILLER = ["ваговий", "вагова", "вагове", "вагові", "свіжий", "свіжа", "свіже", "свіжі", "кг", "за", "1", "шт", "фасований", "фасована"];

function words(name: string) {
  return name
    .toLowerCase()
    .replace(/[ʼ’']/g, "'")
    .replace(/[«»"(),.~%/]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Grouping key, or null if the product must not be merged by name. */
export function freshProduceKey(product: Pick<Product, "name" | "barcode" | "volume">): string | null {
  if (classifyBarcode(product.barcode).kind === "global") return null;
  if (!/кг/i.test(product.volume) || !/^за\s/i.test(product.volume.trim())) return null;
  if (/[a-z]/i.test(product.name)) return null;

  const all = words(product.name);
  if (!all.length || !PRODUCE_STEMS.some((stem) => all.some((word) => word.startsWith(stem)))) return null;
  // The produce noun must lead the name ("Капуста цвітна") or follow one adjective
  // ("Молода капуста"); otherwise it is probably a dish or a mix ("Суміш з капустою").
  const nounIndex = all.findIndex((word) => PRODUCE_STEMS.some((stem) => word.startsWith(stem)));
  if (nounIndex > 1) return null;

  const meaningful = all.filter((word) => !COUNTRIES.includes(word) && !FILLER.includes(word) && !/^\d/.test(word));
  return meaningful.length ? meaningful.sort().join(" ") : null;
}

/** "капуста молода" -> "Капуста молода" with the produce noun first. */
function displayName(key: string) {
  const parts = key.split(" ");
  const noun = parts.findIndex((word) => PRODUCE_STEMS.some((stem) => word.startsWith(stem)));
  const ordered = noun > 0 ? [parts[noun], ...parts.filter((_, i) => i !== noun)] : parts;
  const text = ordered.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type WeighedMatch = { key: string; name: string; kind: "produce" | "meat"; brand?: string | null };

/** Group key and display name for a weighed product, or null if it must stay as is. */
export function weighedMatch(product: Pick<Product, "name" | "barcode" | "volume">): WeighedMatch | null {
  if (classifyBarcode(product.barcode).kind === "global") return null;
  if (!/кг/i.test(product.volume) || !/^за\s/i.test(product.volume.trim())) return null;
  const produce = freshProduceKey(product);
  if (produce) return { key: produce, name: displayName(produce), kind: "produce" };
  const meat = freshMeatMatch(product.name);
  return meat ? { ...meat, kind: "meat" } : null;
}

const DESCRIPTIONS = {
  produce: "Свіжі овочі чи фрукти на вагу. Ціни різних магазинів об'єднано за назвою: сорт і походження можуть відрізнятися.",
  meat: "Охолоджене м'ясо на вагу. Ціни різних магазинів об'єднано за видом м'яса, частиною й брендом: виробник і калібр можуть відрізнятися."
};

const canonicalBarcode = (key: string) => `fresh:${key.replace(/\s+/g, "-")}:kg`;

export type FreshMergeGroup = {
  key: string;
  name: string;
  stores: string[];
  products: string[];
  status: "merged" | "would_merge" | "skipped";
  reason?: string;
};

export async function mergeFreshProduce({ dryRun = false } = {}): Promise<FreshMergeGroup[]> {
  const products = await prisma.product.findMany({
    include: { sources: { include: { store: true } }, _count: { select: { prices: true } } },
    orderBy: { name: "asc" }
  });

  const groups = new Map<string, typeof products>();
  const matches = new Map<string, WeighedMatch>();
  for (const product of products) {
    const match = weighedMatch(product);
    if (!match) continue;
    matches.set(match.key, match);
    groups.set(match.key, [...(groups.get(match.key) ?? []), product]);
  }

  const result: FreshMergeGroup[] = [];
  for (const [key, members] of groups) {
    if (members.length < 2) {
      // Already merged earlier: keep its name, brand and note in line with the current rules.
      const [only] = members;
      const match = matches.get(key)!;
      const brand = match.brand ?? "Без бренду";
      if (!dryRun && only.barcode === canonicalBarcode(key) && (only.name !== match.name || only.brand !== brand || only.description !== DESCRIPTIONS[match.kind])) {
        await prisma.product.update({ where: { id: only.id }, data: { name: match.name, brand, description: DESCRIPTIONS[match.kind] } });
      }
      continue;
    }
    const storeNames = members.flatMap((product) => product.sources.map((source) => source.store.name));
    const match = matches.get(key)!;
    const row = { key, name: match.name, stores: storeNames, products: members.map((product) => product.name) };

    if (new Set(storeNames).size !== storeNames.length) {
      result.push({ ...row, status: "skipped", reason: "Two products from the same store" });
      continue;
    }
    if (dryRun) {
      result.push({ ...row, status: "would_merge" });
      continue;
    }

    // Keep the already-canonical product if there is one, else the one with most history.
    const target =
      members.find((product) => product.barcode === canonicalBarcode(key)) ??
      [...members].sort((a, b) => b._count.prices - a._count.prices)[0];
    const others = members.filter((product) => product.id !== target.id);
    const specificCategory = members.map((product) => product.category).find((category) => category === "Овочі" || category === "Фрукти");

    await prisma.$transaction(async (tx) => {
      for (const other of others) {
        await moveProductData(tx, target.id, other.id);
      }

      await tx.product.update({
        where: { id: target.id },
        data: {
          name: match.name,
          barcode: canonicalBarcode(key),
          brand: match.brand ?? "Без бренду",
          category: match.kind === "meat" ? "М'ясо" : specificCategory ?? target.category,
          imageUrl: target.imageUrl ?? others.find((product) => product.imageUrl)?.imageUrl ?? null,
          description: DESCRIPTIONS[match.kind]
        }
      });
    });

    result.push({ ...row, status: "merged" });
  }

  return result;
}
