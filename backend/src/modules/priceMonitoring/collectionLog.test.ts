import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_LOGGED_ISSUES, summarizeRun } from "./collectionLog";

describe("summarizeRun", () => {
  it("reports a clean run as success and counts distinct products", () => {
    const summary = summarizeRun(
      [
        { product: "A", store: "x", status: "created" },
        { product: "A", store: "y", status: "created" },
        { product: "B", store: "x", status: "not_found" },
        { product: "B", store: "y", status: "marked_unavailable" }
      ],
      [{ store: "x", status: "created" }]
    );
    assert.deepEqual(summary, { status: "success", productsChecked: 2, pricesRecorded: 2, issuesCount: 0, issues: [] });
  });

  it("marks the run partial when a page failed or a price was not confirmed", () => {
    const summary = summarizeRun(
      [
        { product: "A", store: "x", status: "error", reason: "HTTP 503" },
        { product: "B", store: "x", status: "unconfirmed", reason: "No product data on page" }
      ],
      [{ store: "y", status: "failed", reason: "HTTP 500" }]
    );
    assert.equal(summary.status, "partial");
    assert.equal(summary.issuesCount, 3);
    assert.deepEqual(summary.issues[0], { store: "y", status: "promotions_failed", reason: "HTTP 500" });
    assert.deepEqual(summary.issues[1], { store: "x", product: "A", status: "error", reason: "HTTP 503" });
  });

  it("keeps the full count but caps the stored details", () => {
    const rows = Array.from({ length: MAX_LOGGED_ISSUES + 50 }, (_, i) => ({ product: `P${i}`, store: "x", status: "error" }));
    const summary = summarizeRun(rows, []);
    assert.equal(summary.issuesCount, MAX_LOGGED_ISSUES + 50);
    assert.equal(summary.issues.length, MAX_LOGGED_ISSUES);
  });
});
