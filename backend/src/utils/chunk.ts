/** Splits a list into consecutive parts of at most `size` items. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError("chunk size must be a positive integer");
  const parts: T[][] = [];
  for (let start = 0; start < items.length; start += size) parts.push(items.slice(start, start + size));
  return parts;
}
