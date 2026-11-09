/**
 * Shows recent price collection runs.
 *
 *   npm run monitor:runs                 last 10 runs
 *   npm run monitor:runs -- --limit=30
 *   npm run monitor:runs -- --issues     also list what failed in the latest run
 */
import "dotenv/config";
import { prisma } from "../../prisma";

function numberArg(name: string, fallback: number) {
  const value = Number(process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=")[1]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function main() {
  const runs = await prisma.collectionRun.findMany({ orderBy: { startedAt: "desc" }, take: numberArg("limit", 10) });
  if (!runs.length) {
    console.log("No collection runs recorded yet.");
    return;
  }

  console.table(
    runs.map((run) => ({
      started: run.startedAt.toISOString().slice(0, 16).replace("T", " "),
      minutes: run.finishedAt ? Math.round((run.finishedAt.getTime() - run.startedAt.getTime()) / 6000) / 10 : null,
      trigger: run.trigger,
      status: run.status,
      products: run.productsChecked,
      prices: run.pricesRecorded,
      issues: run.issuesCount,
      error: run.error ?? ""
    }))
  );

  if (process.argv.includes("--issues")) {
    console.log("Stores in the latest run");
    console.table(runs[0].stores);
    console.log("Issues in the latest run");
    console.table(runs[0].issues);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
