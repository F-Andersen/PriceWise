import { ComparisonResult } from "../types";

export type ComparisonSummary = {
  /** Магазини, де є всі товари кошика, від найдешевшого. Тільки їхні суми можна порівнювати. */
  complete: ComparisonResult[];
  /** Магазини, де є частина товарів, від найбільшого покриття. */
  partial: ComparisonResult[];
  /** Магазини без жодної ціни з кошика. */
  noData: ComparisonResult[];
  /** Різниця між найдешевшим і найдорожчим повним кошиком; null, якщо порівнювати нема з чим. */
  spread: number | null;
};

/**
 * Прапорець isBest і поле difference із backend не використовуються: вони рахують
 * найменшу суму серед усіх магазинів, зокрема з неповним кошиком.
 */
export function summarizeComparison(results: ComparisonResult[]): ComparisonSummary {
  const complete = results.filter((item) => item.foundCount > 0 && item.missingCount === 0).sort((a, b) => a.totalPrice - b.totalPrice);
  const partial = results.filter((item) => item.foundCount > 0 && item.missingCount > 0).sort((a, b) => b.foundCount - a.foundCount || a.store.name.localeCompare(b.store.name, "uk"));
  const noData = results.filter((item) => item.foundCount === 0);
  const spread = complete.length >= 2 ? Math.round((complete[complete.length - 1].totalPrice - complete[0].totalPrice) * 100) / 100 : null;
  return { complete, partial, noData, spread };
}
