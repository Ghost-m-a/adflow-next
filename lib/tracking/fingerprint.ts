import { createHmac } from "node:crypto";

const SALT =
  process.env.TRACKING_HASH_SALT ||
  process.env.SESSION_SECRET ||
  "adflow-dev-salt";

function hmac(value: string): string {
  return createHmac("sha256", SALT).update(value).digest("hex");
}

/** Never store raw IPs. HMAC-SHA256 makes them non-reversible. */
export function hashIp(ip: string): string {
  return ip ? hmac(`ip:${ip}`) : "";
}

export function hashUserAgent(userAgent: string): string {
  return userAgent ? hmac(`ua:${userAgent}`) : "";
}

/**
 * Fingerprint used for dedupe of accidental double-clicks.
 * Scoped by campaign so the same visitor can legitimately click
 * different campaigns.
 */
export function clickFingerprint(input: {
  ipHash: string;
  userAgentHash: string;
  campaignId: string;
}): string {
  return hmac(
    `fp:${input.campaignId}:${input.ipHash}:${input.userAgentHash}`,
  );
}
