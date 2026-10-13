import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.TAX_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "TAX_ENCRYPTION_KEY must be a 32-byte hex string (64 chars).",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts PII (SSN / TIN) with AES-256-GCM.
 *
 * The output format is `iv:authTag:ciphertext`, all hex-encoded.
 * Encryption is symmetric and reversible only with the same key.
 *
 * Production note: swap this for a KMS-managed key (AWS KMS, GCP KMS,
 * or Vault). Rotate the key at least annually.
 */
export function encryptPii(plaintext: string): string {
  if (!plaintext) return "";
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptPii(payload: string): string {
  if (!payload) return "";
  const [ivHex, tagHex, ctHex] = payload.split(":");
  if (!ivHex || !tagHex || !ctHex) {
    throw new Error("Malformed encrypted payload.");
  }
  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Returns the last 4 digits of a TIN for display without decrypting. */
export function last4(value: string): string {
  const clean = value.replace(/\D/g, "");
  return clean.length >= 4 ? clean.slice(-4) : clean;
}
