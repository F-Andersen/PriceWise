/**
 * Manual price collection run: promotions first (they bring new products), then
 * every catalogue product is looked up by barcode in each store. The API also runs
 * this on a schedule (see priceScheduler.ts); both share one lock.
 *
 *   npm run monitor:prices                     full run
 *   npm run monitor:prices -- --dry-run        fetch and parse, write nothing
 *   npm run monitor:prices -- --limit=5        only the first 5 products
 *   npm run monitor:prices -- --stores=Novus,METRO
 *   npm run monitor:prices -- --promo-limit=20 --skip-promotions --verbose
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
  const { promotions, collectedAt, rows, summary, prunedRows } = await runPriceCollection({
    dryRun,
    limit: numberArg("limit"),
    storeNames: arg("stores")?.split(",").map((name) => name.trim()),
    promoLimit: numberArg("promo-limit"),
    skipPromotions: flag("skip-promotions")
  });

  if (promotions.length) {
    console.log("Promotions");
    console.table(promotions);
  }
  console.log(`Catalogue by barcode${dryRun ? " (dry run, nothing written)" : ""}, collected at ${collectedAt.toISOString()}`);
  if (flag("verbose")) console.table(rows);
  else console.table(rows.filter((row) => row.status === "error" || row.status === "marked_unavailable"));
  console.table(summary);
  if (prunedRows) console.log(`Old price history removed: ${prunedRows} rows`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
