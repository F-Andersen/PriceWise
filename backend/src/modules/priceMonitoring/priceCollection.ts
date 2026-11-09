import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../prisma";
import { summarizeRun } from "./collectionLog";
import { mergeFreshProduce } from "./freshProduceMatching";
import { refreshMatchCandidates } from "./matchReview";
import { pruneOldPriceHistory } from "./priceHistory";
import { syncZakazCatalog, type CatalogSyncOptions } from "./zakazCatalogSync";
import { collectedStoresWhere } from "./zakazStores";

export type PriceCollectionOptions = CatalogSyncOptions & {
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

export type CollectionTrigger = "manual" | "scheduled" | "catch-up";

/** The log must never be the reason a collection fails. */
async function logSafely(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    console.error(`[prices] could not write the collection log: ${error instanceof Error ? error.message : error}`);
  }
}

export async function runPriceCollection(options: PriceCollectionOptions = {}, trigger: CollectionTrigger = "manual") {
  const dryRun = options.dryRun ?? false;
  if (!dryRun && !acquireLock()) throw new CollectionAlreadyRunningError();
  let runId: string | null = null;
  if (!dryRun) {
    await logSafely(async () => {
      // We hold the lock, so anything still "running" belongs to a process that died.
      await prisma.collectionRun.updateMany({ where: { status: "running" }, data: { status: "interrupted", finishedAt: new Date() } });
      runId = (await prisma.collectionRun.create({ data: { trigger, status: "running" } })).id;
    });
  }
  try {
    const catalogue = await syncZakazCatalog(options);
    // Weighed produce has no shared barcode: merge it across stores by name.
    const freshMerges = dryRun ? [] : (await mergeFreshProduce()).filter((group) => group.status === "merged");
    // Only suggests pairs for review; a failure here must not lose the collected prices.
    if (!dryRun) await logSafely(refreshMatchCandidates);
    const prunedRows = dryRun ? 0 : await pruneOldPriceHistory(historyRetentionDays());
    const finishedId = runId;
    if (finishedId) {
      const run = summarizeRun(catalogue.rows);
      await logSafely(() =>
        prisma.collectionRun.update({ where: { id: finishedId }, data: { ...run, stores: catalogue.summary, finishedAt: new Date() } })
      );
    }
    return { ...catalogue, freshMerges, prunedRows };
  } catch (error) {
    const failedId = runId;
    if (failedId) {
      await logSafely(() =>
        prisma.collectionRun.update({
          where: { id: failedId },
          data: { status: "failed", finishedAt: new Date(), error: error instanceof Error ? error.message : String(error) }
        })
      );
    }
    throw error;
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
