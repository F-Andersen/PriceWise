/**
 * Helpers for GTIN/EAN barcodes.
 *
 * Barcodes in the DB come in mixed forms (13 digits, 14 digits with a leading 0,
 * store-internal codes). Cross-store matching is only safe for valid, globally
 * unique GTINs. Restricted-circulation codes (GTIN-13 prefix 20–29) are assigned by
 * each retailer for weighed goods, so the same code can mean different products
 * in different stores.
 */

export function toGtin14(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14 || digits !== raw.trim()) return null;
  return digits.padStart(14, "0");
}

export function hasValidCheckDigit(gtin14: string): boolean {
  const digits = gtin14.split("").map(Number);
  const check = digits.pop()!;
  // From the right (excluding the check digit), weights alternate 3, 1, 3, 1...
  const sum = digits.reverse().reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export type GtinKind = "global" | "store-internal" | "invalid";

export function classifyBarcode(raw: string): { kind: GtinKind; gtin14: string | null } {
  const gtin14 = toGtin14(raw);
  if (!gtin14 || !hasValidCheckDigit(gtin14)) return { kind: "invalid", gtin14 };
  // Fewer than 8 significant digits is not a GTIN at all: it's a store's own item code
  // (e.g. МегаМаркет weighed goods "123303"), zero-padded.
  if (gtin14.startsWith("0000000")) return { kind: "store-internal", gtin14 };
  // Non-zero indicator digit = trade unit (case/pack), not a consumer item.
  if (gtin14[0] !== "0") return { kind: "store-internal", gtin14 };
  // GTIN-13 prefixes 20–29: restricted circulation (in-store weighed goods).
  if (gtin14[1] === "2") return { kind: "store-internal", gtin14 };
  return { kind: "global", gtin14 };
}
