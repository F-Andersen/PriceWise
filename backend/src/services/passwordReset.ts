import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * One-time codes for a forgotten password. A six-digit code works the same in the
 * browser and the app. Its small range is safe only together with the short life
 * and the attempt limit below; the stored value is keyed, so a leaked table is useless.
 */
export const RESET_CODE_TTL_MS = 15 * 60 * 1000;
export const MAX_RESET_ATTEMPTS = 5;
/** A new code for the same account no sooner than this, so nobody can flood a mailbox. */
export const RESET_RESEND_INTERVAL_MS = 60 * 1000;

export function generateResetCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashResetCode(code: string, secret: string) {
  return createHmac("sha256", secret).update(code).digest("hex");
}

export function isResetCodeCorrect(code: string, storedHash: string, secret: string) {
  const actual = Buffer.from(hashResetCode(code, secret), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

export function canResendResetCode(lastSentAt: Date | null | undefined, now = new Date()) {
  return !lastSentAt || now.getTime() - lastSentAt.getTime() >= RESET_RESEND_INTERVAL_MS;
}

/** Sessions issued before the last password change carry an older version. */
export function isTokenVersionCurrent(tokenVersion: number | undefined, userVersion: number) {
  return (tokenVersion ?? 0) === userVersion;
}
