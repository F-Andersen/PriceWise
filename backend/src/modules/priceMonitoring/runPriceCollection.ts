/**
 * Manual price collection run. Walks each chain's food categories; the API also runs
 * this on a schedule (see priceScheduler.ts) and both share one lock.
 *
 *   npm run monitor:prices                               full run (about an hour)
 *   npm run monitor:prices -- --dry-run                  fetch and parse, write nothing
 *   npm run monitor:prices -- --stores=Novus,METRO
 *   npm run monitor:prices -- --categories=bakery --max-pages=2 --verbose
 */
import "dotenv/config";
import { prisma } from "../../prisma";
import { runPriceCollection } from "./priceCollection";

function arg(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}
const flag = (name: string) => process.argv.includes(`--${name}`);
const numberArg = (name: string) => {
  const value = Number(arg(name));
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

async function main() {
  const dryRun = flag("dry-run");
  const { collectedAt, rows, summary, freshMerges, prunedRows } = await runPriceCollection({
    dryRun,
    storeNames: arg("stores")?.split(",").map((name) => name.trim()),
    categories: arg("categories")?.split(",").map((name) => name.trim()),
    maxPages: numberArg("max-pages")
  });

  console.log(`Catalogue from category pages${dryRun ? " (dry run, nothing written)" : ""}, collected at ${collectedAt.toISOString()}`);
  if (flag("verbose")) console.table(rows);
  else console.table(rows.filter((row) => row.status === "error" || row.status === "marked_unavailable" || row.status === "unconfirmed"));
  console.table(summary);
  if (freshMerges.length) {
    console.log("Fresh produce merged across stores");
    console.table(freshMerges.map(({ name, stores }) => ({ name, stores: stores.join(", ") })));
  }
  if (prunedRows) console.log(`Old price history removed: ${prunedRows} rows`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
