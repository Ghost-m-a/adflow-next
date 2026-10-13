import { randomBytes, createHash } from "node:crypto";

/**
 * Generates a 32-byte URL-safe tracking token (64 hex chars).
 * This is the value that goes in /r/{token}. The raw token is never
 * stored — only its SHA-256 hash is persisted.
 */
export function generateTrackingToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashTrackingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Query parameter name appended to the destination URL. */
export const CLICK_ID_PARAM = "adflow_click";

/** Cookie name set by the redirect service (same-origin only). */
export const ATTRIBUTION_COOKIE = "adflow_attr";

/**
 * Best-effort client IP extraction behind common proxies.
 * Returns empty string when nothing usable is present.
 */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();

  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    ""
  );
}
