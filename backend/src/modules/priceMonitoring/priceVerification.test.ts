import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideRecheck, isSharpChange, recheckDelayMs, verifySharpChanges, type RecheckDeps } from "./priceVerification";

describe("isSharpChange", () => {
  it("flags changes above 15% in either direction", () => {
    assert.equal(isSharpChange(235, 185), true); // the real METRO case: −21%
    assert.equal(isSharpChange(185, 235), true);
  });
  it("ignores ordinary changes and exactly 15%", () => {
    assert.equal(isSharpChange(100, 90), false);
    assert.equal(isSharpChange(100, 85), false);
  });
  it("has nothing to compare with a zero previous price", () => {
    assert.equal(isSharpChange(0, 50), false);
  });
});

describe("decideRecheck", () => {
  it("confirms when the second reading repeats the new price", () => {
    assert.equal(decideRecheck(235, 185, 185), "confirmed");
  });
  it("recognises a return to the previous price", () => {
    assert.equal(decideRecheck(235, 185, 235), "reverted");
  });
  it("stays unconfirmed for a third value or a failed reading", () => {
    assert.equal(decideRecheck(235, 185, 199), "unconfirmed");
    assert.equal(decideRecheck(235, 185, null), "unconfirmed");
  });
});

describe("recheckDelayMs", () => {
  it("defaults to three minutes and accepts an override, including zero", () => {
    assert.equal(recheckDelayMs(""), 180000);
    assert.equal(recheckDelayMs("5000"), 5000);
    assert.equal(recheckDelayMs("0"), 0);
    assert.equal(recheckDelayMs("abc"), 180000);
  });
});

describe("verifySharpChanges", () => {
  function setup(readings: Record<string, number | null | "throw">) {
    const accepted: string[] = [];
    const rejected: string[] = [];
    const logged: Array<{ item: string; decision: string; evidence: unknown }> = [];
    const waits: number[] = [];
    const deps: RecheckDeps<string, string> = {
      readAgain: async (item) => {
        const value = readings[item];
        if (value === "throw") throw new Error("network");
        return value === null ? null : { price: value, evidence: { price: value } };
      },
      accept: async (item) => {
        accepted.push(item);
        return `accepted:${item}`;
      },
      reject: (item) => {
        rejected.push(item);
        return `rejected:${item}`;
      },
      wait: async (ms) => waits.push(ms),
      log: (entry) => logged.push(entry)
    };
    return { deps, accepted, rejected, logged, waits };
  }

  it("does not wait or read anything when there is nothing to check", async () => {
    const { deps, waits } = setup({});
    assert.deepEqual(await verifySharpChanges([], 1000, deps), []);
    assert.deepEqual(waits, []);
  });

  it("records confirmed and reverted prices, rejects the rest, and logs every case", async () => {
    const { deps, accepted, rejected, logged, waits } = setup({ same: 185, back: 235, other: 199, gone: null, broken: "throw" });
    const pending = ["same", "back", "other", "gone", "broken"].map((item) => ({ previous: 235, first: 185, item }));
    const results = await verifySharpChanges(pending, 1000, deps);

    assert.deepEqual(waits, [1000], "waits once, before all second readings");
    assert.deepEqual(accepted, ["same", "back"]);
    assert.deepEqual(rejected, ["other", "gone", "broken"]);
    assert.equal(results.length, 5);
    assert.deepEqual(
      logged.map((entry) => [entry.item, entry.decision]),
      [["same", "confirmed"], ["back", "reverted"], ["other", "unconfirmed"], ["gone", "unconfirmed"], ["broken", "unconfirmed"]]
    );
    assert.deepEqual(logged[0].evidence, { price: 185 });
    assert.equal(logged[3].evidence, null);
  });
});
