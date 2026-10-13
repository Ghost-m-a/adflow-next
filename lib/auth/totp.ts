import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = 6;
const PERIOD = 30;

/* ----------------------------------------------------------
   Base32 (RFC 4648)
---------------------------------------------------------- */

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid base32 character.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/* ----------------------------------------------------------
   TOTP
---------------------------------------------------------- */

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function generateTotp(
  secret: string,
  time: number = Date.now(),
): string {
  const counter = Math.floor(time / 1000 / PERIOD);

  const counterBuf = Buffer.alloc(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }

  const key = base32Decode(secret);
  const hmac = createHmac("sha1", key).update(counterBuf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** DIGITS;
  return otp.toString().padStart(DIGITS, "0");
}

/** Verifies a token with ±1 window. */
export function verifyTotp(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;

  const now = Date.now();
  for (const offset of [-1, 0, 1]) {
    const expected = generateTotp(secret, now + offset * PERIOD * 1000);
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri(input: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.accountName}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ----------------------------------------------------------
   Backup codes
---------------------------------------------------------- */

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "salt")
    .update(code.toUpperCase().replace(/-/g, ""))
    .digest("hex");
}
