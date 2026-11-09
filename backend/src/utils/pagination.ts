export const DEFAULT_PAGE_SIZE = 30;
export const MAX_PAGE_SIZE = 100;

/** Reads ?page and ?limit; anything invalid falls back to the first page and default size. */
export function parsePagination(query: { page?: unknown; limit?: unknown }) {
  const toPositive = (value: unknown) => {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const page = toPositive(query.page) ?? 1;
  const limit = Math.min(toPositive(query.limit) ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  return { page, limit, skip: (page - 1) * limit };
}

export function hasMorePages(skip: number, returned: number, total: number) {
  return skip + returned < total;
}
