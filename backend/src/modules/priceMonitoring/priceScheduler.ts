import { CollectionAlreadyRunningError, lastCollectedAt, runPriceCollection } from "./priceCollection";

/**
 * Collects prices once a day inside the API process, so prices stay fresh without
 * anyone running the script by hand. Works the same on a dev PC and on a server.
 *
 * Env:
 *   PRICE_SYNC_ENABLED  "false" turns it off (default: on)
 *   PRICE_SYNC_TIME     daily start time, server local time, "HH:MM" (default 06:00)
 *
 * On start it also catches up: if the last collection is older than 24 h (the PC
 * was off at the scheduled time), it starts one shortly after boot.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const CATCH_UP_DELAY_MS = 60 * 1000;

function parseTime(value: string | undefined) {
  const match = value?.match(/^(\d{1,2}):(\d{2})$/);
  const hours = match ? Number(match[1]) : 6;
  const minutes = match ? Number(match[2]) : 0;
  return hours < 24 && minutes < 60 ? { hours, minutes } : { hours: 6, minutes: 0 };
}

export function msUntilNext(time: { hours: number; minutes: number }, now = new Date()) {
  const next = new Date(now);
  next.setHours(time.hours, time.minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

const log = (message: string) => console.log(`[prices] ${new Date().toISOString()} ${message}`);

async function collect(reason: string) {
  log(`collection started (${reason})`);
  try {
    const { summary } = await runPriceCollection();
    const line = summary.map((row) => `${row.store}: ${row.prices}`).join(", ");
    log(`collection finished: ${line}`);
  } catch (error) {
    if (error instanceof CollectionAlreadyRunningError) log("skipped: another collection is running");
    else log(`collection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function startPriceScheduler() {
  if (process.env.PRICE_SYNC_ENABLED === "false") {
    log("scheduler disabled (PRICE_SYNC_ENABLED=false)");
    return;
  }
  const time = parseTime(process.env.PRICE_SYNC_TIME);

  const scheduleNext = () => {
    const delay = msUntilNext(time);
    log(`next collection at ${new Date(Date.now() + delay).toLocaleString("uk-UA")}`);
    setTimeout(async () => {
      await collect("daily");
      scheduleNext();
    }, delay);
  };
  scheduleNext();

  lastCollectedAt()
    .then((last) => {
      if (last && Date.now() - last.getTime() < DAY_MS) return;
      log(`last collection ${last ? last.toISOString() : "never"}; catching up in ${CATCH_UP_DELAY_MS / 1000}s`);
      setTimeout(() => void collect("catch-up"), CATCH_UP_DELAY_MS);
    })
    .catch((error) => log(`could not read last collection time: ${error instanceof Error ? error.message : error}`));
}
