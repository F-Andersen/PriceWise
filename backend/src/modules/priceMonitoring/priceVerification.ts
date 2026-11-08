/**
 * A store page can briefly show a wrong or unusual price. A sharp change is
 * therefore not recorded on first sight: the page is read again later in the same
 * collection, and every such case is logged with the raw price fields, so the
 * cause can be investigated afterwards.
 */

/** Changes bigger than this share of the previous price need a second reading. */
export const SHARP_CHANGE_RATIO = 0.15;
const DEFAULT_RECHECK_DELAY_MS = 3 * 60 * 1000;

/** Pause before the second reading. PRICE_RECHECK_DELAY_MS overrides it (0 = no pause). */
export function recheckDelayMs(value = process.env.PRICE_RECHECK_DELAY_MS) {
  if (value === undefined || value.trim() === "") return DEFAULT_RECHECK_DELAY_MS;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_RECHECK_DELAY_MS;
}

export function isSharpChange(previous: number, next: number, ratio = SHARP_CHANGE_RATIO) {
  return previous > 0 && Math.abs(next - previous) / previous > ratio;
}

/** Above this share of a store's known products, disappearing at once looks like a failure. */
export const MASS_GONE_SHARE = 0.3;
export const MASS_GONE_MIN_COUNT = 5;

/**
 * True when so many previously available products vanished from one store in a
 * single run that a site failure is likelier than real delistings. A few products
 * going away is normal; 40% of a store is not.
 */
export function looksLikeMassFailure(goneCount: number, knownCount: number) {
  return goneCount >= MASS_GONE_MIN_COUNT && knownCount > 0 && goneCount / knownCount > MASS_GONE_SHARE;
}

const samePrice = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * confirmed: the second reading repeats the new price.
 * reverted: the second reading is back at the previous price.
 * unconfirmed: the page failed, or shows yet another price.
 */
export type RecheckDecision = "confirmed" | "reverted" | "unconfirmed";

export function decideRecheck(previous: number, first: number, second: number | null): RecheckDecision {
  if (second === null) return "unconfirmed";
  if (samePrice(second, first)) return "confirmed";
  if (samePrice(second, previous)) return "reverted";
  return "unconfirmed";
}

export type PendingCheck<T> = { previous: number; first: number; item: T };

export type RecheckDeps<T, R> = {
  /** Reads the page again; null if it failed or the product is gone. */
  readAgain: (item: T) => Promise<{ price: number; evidence: unknown } | null>;
  /** Records the second reading: it is the freshest and matches a known price. */
  accept: (item: T) => Promise<R>;
  /** Records nothing: the previous price stays and its check time does not move. */
  reject: (item: T, second: number | null) => R;
  wait: (ms: number) => Promise<unknown>;
  log: (entry: { item: T; previous: number; first: number; second: number | null; decision: RecheckDecision; evidence: unknown }) => void;
};

export async function verifySharpChanges<T, R>(pending: PendingCheck<T>[], delayMs: number, deps: RecheckDeps<T, R>): Promise<R[]> {
  if (!pending.length) return [];
  await deps.wait(delayMs);

  const results: R[] = [];
  for (const check of pending) {
    let reading: Awaited<ReturnType<typeof deps.readAgain>> = null;
    try {
      reading = await deps.readAgain(check.item);
    } catch {
      reading = null;
    }
    const second = reading?.price ?? null;
    const decision = decideRecheck(check.previous, check.first, second);
    deps.log({ item: check.item, previous: check.previous, first: check.first, second, decision, evidence: reading?.evidence ?? null });
    results.push(decision === "unconfirmed" ? deps.reject(check.item, second) : await deps.accept(check.item));
  }
  return results;
}
