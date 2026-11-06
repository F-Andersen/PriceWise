/**
 * Merge weighed fresh produce across stores (see freshProduceMatching.ts).
 * Also runs automatically after every price collection.
 *
 *   npm run catalog:merge-fresh -- --dry-run   show the groups, change nothing
 *   npm run catalog:merge-fresh                merge
 */
import "dotenv/config";
import { prisma } from "../../prisma";
import { mergeFreshProduce } from "./freshProduceMatching";

mergeFreshProduce({ dryRun: process.argv.includes("--dry-run") })
  .then((groups) => console.table(groups.map(({ name, status, stores, products, reason }) => ({ name, status, stores: stores.join(", "), products: products.join(" | "), reason: reason ?? "" }))))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
