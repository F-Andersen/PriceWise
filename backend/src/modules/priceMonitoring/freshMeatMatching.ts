/**
 * Name-based matching for fresh meat sold by weight (no shared barcode).
 *
 * A name is reduced to species + cut + state + whatever words remain (brand,
 * extra descriptors). Every word must be understood or it becomes part of the
 * key, so two names only match when they really say the same thing:
 *   "Філе стегна курчат-бройлерів охолоджене" = "Курка філе стегна"
 *   "Стегно куряче охолоджене"                 ≠ "Філе стегна курячого охолоджене"
 *   "Філе стегна куряче Супер Філео ..."       ≠ "Філе стегна курячого охолоджене"
 * Processed meat (sausages, ham, smoked or boiled goods) is never matched.
 */

/** Species by word stem, so mixes like "свинно-яловичий" are caught as two species. */
const SPECIES_STEMS: Array<[string, string]> = [
  ["кур", "куряче"],
  ["бройлер", "куряче"],
  ["свин", "свиняче"],
  ["ялович", "яловиче"],
  ["телят", "теляче"],
  ["індич", "індиче"],
  ["індик", "індиче"],
  ["кроля", "кроляче"],
  ["кролик", "кроляче"],
  ["качин", "качине"],
  ["кач", "качине"],
  ["баран", "баранина"]
];

/** Cut words; "філе" is resolved together with the other cut word below. */
const CUT_WORDS: Record<string, string> = {
  стегно: "стегно", стегна: "стегно", стегон: "стегно",
  гомілка: "гомілка", гомілки: "гомілка", гомілок: "гомілка",
  крило: "крило", крила: "крило", крил: "крило", крильця: "крило",
  тушка: "тушка", тушки: "тушка",
  фарш: "фарш",
  печінка: "печінка", печінки: "печінка",
  грудка: "грудка", грудки: "грудка",
  серця: "серця", шлунки: "шлунки"
};

const STATE: Record<string, string> = {
  охолоджене: "охолоджене", охолоджений: "охолоджене", охолоджена: "охолоджене", охолоджені: "охолоджене",
  заморожене: "заморожене", заморожений: "заморожене", заморожена: "заморожене", заморожені: "заморожене"
};

const FILLER = new Set(["вищий", "вищого", "сорт", "сорту", "ваговий", "вагове", "вагова", "кг", "за", "шт", "з", "без", "кісточки", "кістки"]);

const PROCESSED = /(ковбас|сосиск|сардельк|шинк|копчен|варен|в'ялен|сиров'ял|рулет|паштет|бекон|балик|буженин|карбонад|снек|чипс|нагетс|котлет|маринован|шашлик)/i;

const CUT_NAMES: Record<string, string> = {
  "філе стегна": "Філе стегна",
  "філе": "Філе",
  стегно: "Стегно",
  гомілка: "Гомілка",
  крило: "Крило",
  тушка: "Тушка",
  фарш: "Фарш",
  печінка: "Печінка",
  грудка: "Грудка",
  серця: "Серця",
  шлунки: "Шлунки"
};

export function freshMeatMatch(name: string): { key: string; name: string } | null {
  if (/[a-z]/i.test(name) || PROCESSED.test(name)) return null;

  const tokens = name
    .toLowerCase()
    .replace(/[ʼ’']/g, "'")
    .replace(/[«»"(),.~%/]+/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

  let species: string | null = null;
  let hasFillet = false;
  const cuts = new Set<string>();
  let state = "охолоджене"; // loose meat on the counter is chilled unless it says frozen
  const rest: string[] = [];

  for (const token of tokens) {
    const speciesHit = SPECIES_STEMS.find(([stem]) => token.startsWith(stem))?.[1];
    if (speciesHit) {
      if (species && species !== speciesHit) return null; // two species: a mix
      species = speciesHit;
    } else if (token === "філе" || token === "філейне" || token === "філейний") hasFillet = true;
    else if (CUT_WORDS[token]) cuts.add(CUT_WORDS[token]);
    else if (STATE[token]) state = STATE[token];
    else if (FILLER.has(token) || /^\d/.test(token)) continue;
    else rest.push(token);
  }

  if (!species || cuts.size > 1) return null;
  const cut = hasFillet ? (cuts.has("стегно") ? "філе стегна" : cuts.size ? null : "філе") : [...cuts][0] ?? null;
  if (!cut) return null;

  const brand = rest.join(" ");
  const key = ["meat", species, cut, state, ...[...rest].sort()].join(" ");
  const brandTitle = brand.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  const displayName = [CUT_NAMES[cut], species, brandTitle, state].filter(Boolean).join(" ");
  return { key, name: displayName };
}
