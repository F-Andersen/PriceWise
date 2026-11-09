/**
 * Review queue for possible duplicate products.
 *
 *   npm run matches                       counts and the top 20 pending pairs
 *   npm run matches -- --limit=100
 *   npm run matches -- --status=rejected
 *   npm run matches -- approve <id>       merge the two products
 *   npm run matches -- reject <id>        keep them apart for good
 *   npm run matches -- refresh            look for new pairs now (a collection also does)
 *   npm run matches -- approve-all        show what would be merged (exact names only)
 *   npm run matches -- approve-all --yes  merge them
 */
import "dotenv/config";
import { prisma } from "../../prisma";
import { approveAllSameName, approveMatch, countMatchCandidates, listMatchCandidates, refreshMatchCandidates, rejectMatch } from "./matchReview";

const [command, id] = process.argv.slice(2).filter((value) => !value.startsWith("--"));
const option = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];

type Side = { name: string; brand: string; volume: string; sources: Array<{ store: { name: string } }> };
const describeSide = (side: Side) => `${side.name} [${side.volume}; ${side.brand}; ${side.sources.map((source) => source.store.name).join(", ")}]`;

async function main() {
  if (command === "refresh") {
    console.log(`New pairs: ${await refreshMatchCandidates()}`);
    return;
  }

  if (command === "approve-all") {
    if (process.argv.includes("--yes")) {
      const { merged, skipped } = await approveAllSameName();
      console.log(`Merged ${merged} pairs; skipped ${skipped} that no longer applied.`);
    } else {
      const counts = await countMatchCandidates();
      const pending = counts.find((row) => row.status === "pending" && row.reason === "same_name")?._count._all ?? 0;
      console.log(`${pending} exact-name pairs would be merged. Review them with: npm run matches -- --limit=${pending}`);
      console.log("Nothing changed. Add --yes to merge them.");
    }
    return;
  }

  if (command === "approve" || command === "reject") {
    if (!id) throw new Error(`Usage: npm run matches -- ${command} <id>`);
    if (command === "approve") {
      const { kept, merged } = await approveMatch(id);
      console.log(`Merged "${merged}" into "${kept}".`);
    } else {
      await rejectMatch(id);
      console.log("Rejected; this pair will not be suggested again.");
    }
    return;
  }

  console.table((await countMatchCandidates()).map((row) => ({ status: row.status, reason: row.reason, pairs: row._count._all })));
  const limit = Number(option("limit"));
  const pairs = await listMatchCandidates(Number.isInteger(limit) && limit > 0 ? limit : 20, option("status") ?? "pending");
  for (const pair of pairs) {
    console.log(`\n${pair.id}  ${pair.reason} ${pair.score}\n  A: ${describeSide(pair.productA)}\n  B: ${describeSide(pair.productB)}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
