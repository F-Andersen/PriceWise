import { CollectionAlreadyRunningError, lastCollectedAt, runPriceCollection } from "./priceCollection";

/**
 * Collects prices on a daily schedule inside the API process, so prices stay
 * fresh without anyone running the script by hand. Works the same on a dev PC
 * and on a server.
 *
 * Env:
 *   PRICE_SYNC_ENABLED  "false" turns it off (default: on)
 *   PRICE_SYNC_TIME     start times, server local time, comma-separated
 *                       "HH:MM[,HH:MM...]" (default "06:00")
 *
 * On start it also catches up: if the last collection is older than the longest
 * gap between scheduled times (the PC was off), it starts one shortly after boot.
 * Repeated collections don't grow the DB by themselves: unchanged prices only
 * extend the existing row (see priceHistory.ts).
 */
const CATCH_UP_DELAY_MS = 60 * 1000;
const CATCH_UP_GRACE_MS = 15 * 60 * 1000;

type Time = { hours: number; minutes: number };

export function parseTimes(value: string | undefined): Time[] {
  const times = (value ?? "06:00")
    .split(",")
    .map((part) => part.trim().match(/^(\d{1,2}):(\d{2})$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ hours: Number(match[1]), minutes: Number(match[2]) }))
    .filter((time) => time.hours < 24 && time.minutes < 60)
    .sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes));
  const unique = times.filter((time, i) => i === 0 || time.hours * 60 + time.minutes !== times[i - 1].hours * 60 + times[i - 1].minutes);
  return unique.length ? unique : [{ hours: 6, minutes: 0 }];
}

export function msUntilNext(times: Time[], now = new Date()) {
  const candidates = times.map((time) => {
    const next = new Date(now);
    next.setHours(time.hours, time.minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  });
  return Math.min(...candidates);
}

/** Longest wait between two consecutive scheduled runs (24 h for a single time). */
export function longestGapMs(times: Time[]) {
  const minutes = times.map((time) => time.hours * 60 + time.minutes);
  const gaps = minutes.map((m, i) => ((minutes[(i + 1) % minutes.length] - m + 1440) % 1440 || 1440) * 60 * 1000);
  return Math.max(...gaps);
}

const log = (message: string) => console.log(`[prices] ${new Date().toISOString()} ${message}`);

async function collect(reason: string) {
  log(`collection started (${reason})`);
  try {
    const { summary, prunedRows } = await runPriceCollection();
    const line = summary.map((row) => `${row.store}: ${row.prices}`).join(", ");
    log(`collection finished: ${line}${prunedRows ? `; old history removed: ${prunedRows} rows` : ""}`);
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
  const times = parseTimes(process.env.PRICE_SYNC_TIME);

  const scheduleNext = () => {
    const delay = msUntilNext(times);
    log(`next collection at ${new Date(Date.now() + delay).toLocaleString("uk-UA")}`);
    setTimeout(async () => {
      await collect("scheduled");
      scheduleNext();
    }, delay);
  };
  scheduleNext();

  const staleAfter = longestGapMs(times) + CATCH_UP_GRACE_MS;
  lastCollectedAt()
    .then((last) => {
      if (last && Date.now() - last.getTime() < staleAfter) return;
      log(`last collection ${last ? last.toISOString() : "never"}; catching up in ${CATCH_UP_DELAY_MS / 1000}s`);
      setTimeout(() => void collect("catch-up"), CATCH_UP_DELAY_MS);
    })
    .catch((error) => log(`could not read last collection time: ${error instanceof Error ? error.message : error}`));
}
