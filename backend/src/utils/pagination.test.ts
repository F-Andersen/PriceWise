import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasMorePages, parsePagination } from "./pagination";

describe("parsePagination", () => {
  it("defaults to the first page of 30", () => {
    assert.deepEqual(parsePagination({}), { page: 1, limit: 30, skip: 0 });
  });
  it("computes the offset of later pages", () => {
    assert.deepEqual(parsePagination({ page: "3", limit: "20" }), { page: 3, limit: 20, skip: 40 });
  });
  it("caps the page size at 100", () => {
    assert.equal(parsePagination({ limit: "5000" }).limit, 100);
  });
  it("ignores invalid values", () => {
    assert.deepEqual(parsePagination({ page: "-1", limit: "abc" }), { page: 1, limit: 30, skip: 0 });
    assert.deepEqual(parsePagination({ page: "1.5", limit: "0" }), { page: 1, limit: 30, skip: 0 });
    assert.deepEqual(parsePagination({ page: ["2"], limit: { a: 1 } }), { page: 1, limit: 30, skip: 0 });
  });
});

describe("hasMorePages", () => {
  it("is true until the last item is returned", () => {
    assert.equal(hasMorePages(0, 30, 31), true);
    assert.equal(hasMorePages(30, 1, 31), false);
    assert.equal(hasMorePages(0, 0, 0), false);
  });
});
