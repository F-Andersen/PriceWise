import { prisma } from "../../prisma";
import { findCandidatePairs } from "./matchCandidates";
import { moveProductData } from "./productMerge";

/**
 * The review queue for products that may be duplicates. A collection only adds
 * candidates; products are merged when a person approves a pair. A rejected pair
 * stays in the table, so it is not suggested again.
 */

export async function refreshMatchCandidates() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, brand: true, volume: true, sources: { select: { storeId: true } } }
  });
  const pairs = findCandidatePairs(products.map((product) => ({ ...product, storeIds: product.sources.map((source) => source.storeId) })));
  if (!pairs.length) return 0;
  const { count } = await prisma.matchCandidate.createMany({ data: pairs, skipDuplicates: true });
  return count;
}

const withProducts = { productA: { include: { sources: { include: { store: true } } } }, productB: { include: { sources: { include: { store: true } } } } } as const;

export function listMatchCandidates(limit: number, status = "pending") {
  return prisma.matchCandidate.findMany({ where: { status }, include: withProducts, orderBy: [{ score: "desc" }, { id: "asc" }], take: limit });
}

export function countMatchCandidates() {
  return prisma.matchCandidate.groupBy({ by: ["status", "reason"], _count: { _all: true } });
}

/** Merges the pair into the product sold in more stores and returns the result. */
export async function approveMatch(id: string) {
  const candidate = await prisma.matchCandidate.findUnique({ where: { id }, include: withProducts });
  if (!candidate) throw new Error("Match candidate not found");
  if (candidate.status !== "pending") throw new Error(`Match candidate is already ${candidate.status}`);

  const [target, other] =
    candidate.productA.sources.length >= candidate.productB.sources.length ? [candidate.productA, candidate.productB] : [candidate.productB, candidate.productA];
  const targetStores = new Set(target.sources.map((source) => source.storeId));
  if (other.sources.some((source) => targetStores.has(source.storeId))) {
    throw new Error("These products now share a store, so they cannot be the same item");
  }

  await prisma.$transaction((tx) => moveProductData(tx, target.id, other.id)); // removes this candidate too
  return { kept: target.name, merged: other.name };
}

/**
 * Approves every pending exact-name pair after a person asked for it. Names that are
 * only similar are never bulk-approved. Pairs that stop applying after an earlier
 * merge (their product is gone, or the two now share a store) are counted as skipped.
 */
export async function approveAllSameName() {
  const pending = await prisma.matchCandidate.findMany({ where: { status: "pending", reason: "same_name" }, select: { id: true }, orderBy: [{ score: "desc" }, { id: "asc" }] });
  let merged = 0;
  let skipped = 0;
  for (const { id } of pending) {
    try {
      await approveMatch(id);
      merged += 1;
    } catch {
      skipped += 1;
    }
  }
  return { merged, skipped };
}

export async function rejectMatch(id: string) {
  const candidate = await prisma.matchCandidate.findUnique({ where: { id } });
  if (!candidate) throw new Error("Match candidate not found");
  await prisma.matchCandidate.update({ where: { id }, data: { status: "rejected", decidedAt: new Date() } });
}
