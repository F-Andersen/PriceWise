/**
 * Runtime configuration, checked once at start. In production a missing or weak
 * secret stops the server instead of silently falling back to a known value.
 */
const isProduction = process.env.NODE_ENV === "production";

function jwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (value && value.length >= 32 && value !== "replace-with-a-long-random-secret") return value;
  if (isProduction) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in production.");
  }
  if (!value) console.warn("[config] JWT_SECRET is not set; using an insecure development secret.");
  return value || "dev-secret-not-for-production";
}

/**
 * Comma-separated list of allowed web origins. Empty means no cross-origin access:
 * the web app is served from the same origin as /api, and native apps don't use CORS.
 * "*" allows any origin (development only).
 */
function corsOrigins(): string[] | "*" | null {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return isProduction ? null : "*";
  if (raw === "*") {
    if (isProduction) console.warn("[config] CORS_ORIGIN=* in production allows any website to call the API.");
    return "*";
  }
  return raw.split(",").map((origin) => origin.trim()).filter(Boolean);
}

/** Users allowed to change the catalogue through the API (comma-separated emails). */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export const config = {
  isProduction,
  port: Number(process.env.PORT || 4001),
  jwtSecret: jwtSecret(),
  corsOrigins: corsOrigins(),
  adminEmails: adminEmails(),
  /** Behind Caddy/nginx: trust X-Forwarded-For from one proxy hop for client IPs. */
  trustProxy: process.env.TRUST_PROXY === "true" || isProduction
};
