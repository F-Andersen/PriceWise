/**
 * Turns a finished collection into its log record. Pure, so what counts as a clean
 * run is testable. "partial" means the run finished but some pages or products could
 * not be read or confirmed.
 */

export const MAX_LOGGED_ISSUES = 200;

type Row = { product: string; store: string; status: string; reason?: string };

export type RunSummary = {
  status: "success" | "partial";
  productsChecked: number;
  pricesRecorded: number;
  issuesCount: number;
  issues: Array<{ store: string; product?: string; status: string; reason?: string }>;
};

export function summarizeRun(rows: Row[]): RunSummary {
  const issues = rows
    .filter((row) => row.status === "error" || row.status === "unconfirmed")
    .map((row) => ({ store: row.store, product: row.product, status: row.status, reason: row.reason }));
  return {
    status: issues.length ? "partial" : "success",
    productsChecked: new Set(rows.map((row) => row.product)).size,
    pricesRecorded: rows.filter((row) => row.status === "created").length,
    issuesCount: issues.length,
    issues: issues.slice(0, MAX_LOGGED_ISSUES)
  };
}
