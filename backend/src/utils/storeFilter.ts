/**
 * Reads ?excludeStores=id1,id2: the stores the user switched off. Excluding rather
 * than listing means a newly added chain is on by default. Malformed ids are
 * dropped, so a bad value can only widen the result back to all stores.
 */
export function parseExcludedStores(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-zA-Z0-9_-]{1,64}$/.test(id));
  return [...new Set(ids)].slice(0, 50);
}
