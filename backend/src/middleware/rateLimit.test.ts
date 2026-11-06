import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { rateLimit } from "./rateLimit";

function call(limiter: ReturnType<typeof rateLimit>, ip: string) {
  let status = 200;
  let passed = false;
  const res = {
    setHeader: () => res,
    status: (code: number) => {
      status = code;
      return res;
    },
    json: () => res
  } as unknown as Response;
  limiter({ ip } as Request, res, () => {
    passed = true;
  });
  return passed ? 200 : status;
}

describe("rateLimit", () => {
  it("allows up to max requests per IP, then answers 429", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    assert.deepEqual([1, 2, 3, 4].map(() => call(limiter, "1.1.1.1")), [200, 200, 200, 429]);
  });
  it("counts each IP separately", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    assert.equal(call(limiter, "1.1.1.1"), 200);
    assert.equal(call(limiter, "2.2.2.2"), 200);
    assert.equal(call(limiter, "1.1.1.1"), 429);
  });
});
