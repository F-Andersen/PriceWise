import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../prisma";
import { pruneOldPriceHistory } from "./priceHistory";
import { syncPromotionPages } from "./promotionPageSync";
import { syncZakazCatalog, type CatalogSyncOptions } from "./zakazCatalogSync";
import { collectedStoresWhere } from "./zakazStores";

export type PriceCollectionOptions = CatalogSyncOptions & {
  promoLimit?: number;
  skipPromotions?: boolean;
};

/**
 * One collection at a time across processes (the API's scheduler and a manual
 * `npm run monitor:prices`), using a lock file next to package.json. A lock older
 * than the max run time, or held by a dead process, is considered stale.
 */
const LOCK_FILE = path.resolve(__dirname, "../../../.price-collection.lock");
const MAX_RUN_MS = 3 * 60 * 60 * 1000;

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(): boolean {
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  try {
    const held = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as { pid: number; startedAt: string };
    const expired = Date.now() - new Date(held.startedAt).getTime() > MAX_RUN_MS;
    if (!expired && processAlive(held.pid)) return false;
  } catch {
    // unreadable lock: treat as stale
  }
  fs.rmSync(LOCK_FILE, { force: true });
  return acquireLock();
}

function releaseLock() {
  fs.rmSync(LOCK_FILE, { force: true });
}

/**
 * How long ended price periods are kept (PRICE_HISTORY_DAYS, default 730 = two
 * years of history for price analysis). 0 keeps everything.
 */
export function historyRetentionDays() {
  const value = Number(process.env.PRICE_HISTORY_DAYS ?? 730);
  return Number.isFinite(value) && value >= 0 ? value : 730;
}

export class CollectionAlreadyRunningError extends Error {
  constructor() {
    super("Price collection is already running");
  }
}

export async function runPriceCollection(options: PriceCollectionOptions = {}) {
  const dryRun = options.dryRun ?? false;
  if (!dryRun && !acquireLock()) throw new CollectionAlreadyRunningError();
  try {
    const promotions = options.skipPromotions || dryRun ? [] : await syncPromotionPages(options.promoLimit ?? 12);
    const catalogue = await syncZakazCatalog(options);
    const prunedRows = dryRun ? 0 : await pruneOldPriceHistory(historyRetentionDays());
    return { promotions, ...catalogue, prunedRows };
  } finally {
    if (!dryRun) releaseLock();
  }
}

/** When prices were last collected from the stores we track, or null if never. */
export async function lastCollectedAt(): Promise<Date | null> {
  const result = await prisma.price.aggregate({
    where: { store: collectedStoresWhere },
    _max: { lastSeenAt: true }
  });
  return result._max.lastSeenAt;
}
