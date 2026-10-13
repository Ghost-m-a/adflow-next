import mongoose from "mongoose";

import User from "@/models/User";
import {
  buildOtpAuthUri,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  verifyTotp,
} from "@/lib/auth/totp";

export class TwoFactorError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "TwoFactorError";
    this.statusCode = statusCode;
  }
}

const ISSUER = "ADFLOW";

/**
 * Starts 2FA setup. Returns a secret + otpauth URI. The user must
 * verify a code before the 2FA flag flips — this is a draft state,
 * the secret lives in the DB but is not enforced yet.
 */
export async function beginTwoFactorSetup(userId: string) {
  const user = await User.findById(userId)
    .select("email username twoFactorEnabled twoFactorSecret")
    .lean();

  if (!user) throw new TwoFactorError("User not found.", 404);
  if (user.twoFactorEnabled) {
    throw new TwoFactorError("Two-factor authentication is already enabled.", 409);
  }

  const secret = generateTotpSecret();
  const accountName = user.email || user.username;

  await User.updateOne(
    { _id: userId },
    { $set: { twoFactorSecret: secret } },
  );

  return {
    secret,
    otpauthUrl: buildOtpAuthUri({
      secret,
      accountName,
      issuer: ISSUER,
    }),
    issuer: ISSUER,
    accountName,
  };
}

/**
 * Verifies the first code and enables 2FA. Returns the plaintext
 * backup codes — the caller must show them to the user; only the
 * hashed versions are stored.
 */
export async function confirmTwoFactorSetup(
  userId: string,
  token: string,
): Promise<{ backupCodes: string[] }> {
  const user = await User.findById(userId)
    .select("+twoFactorSecret twoFactorEnabled")
    .lean();

  if (!user) throw new TwoFactorError("User not found.", 404);
  if (user.twoFactorEnabled) {
    throw new TwoFactorError("Two-factor authentication is already enabled.", 409);
  }
  if (!user.twoFactorSecret) {
    throw new TwoFactorError(
      "Start setup first — no pending secret found.",
      409,
    );
  }
  if (!verifyTotp(user.twoFactorSecret, token)) {
    throw new TwoFactorError("Invalid verification code.", 401);
  }

  const codes = generateBackupCodes(10);
  const hashed = codes.map(hashBackupCode);

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        twoFactorEnabled: true,
        twoFactorConfirmedAt: new Date(),
        twoFactorBackupCodes: hashed,
      },
    },
  );

  return { backupCodes: codes };
}

/**
 * Verifies a login-time token. Accepts either a 6-digit TOTP code or
 * a one-time backup code. Backup codes are consumed on use.
 */
export async function verifyTwoFactorLogin(
  userId: string,
  token: string,
): Promise<{ ok: boolean; usedBackupCode: boolean }> {
  const user = await User.findById(userId)
    .select("+twoFactorSecret +twoFactorBackupCodes twoFactorEnabled")
    .lean();

  if (!user) throw new TwoFactorError("User not found.", 404);
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new TwoFactorError("Two-factor authentication is not enabled.", 409);
  }

  // 1. Try TOTP.
  if (/^\d{6}$/.test(token) && verifyTotp(user.twoFactorSecret, token)) {
    return { ok: true, usedBackupCode: false };
  }

  // 2. Try backup codes.
  const normalized = token.toUpperCase().replace(/[-\s]/g, "");
  if (normalized.length === 10) {
    const hash = hashBackupCode(token);
    const remaining = (user.twoFactorBackupCodes ?? []).filter(
      (h) => h !== hash,
    );

    if (remaining.length < (user.twoFactorBackupCodes ?? []).length) {
      await User.updateOne(
        { _id: userId },
        { $set: { twoFactorBackupCodes: remaining } },
      );
      return { ok: true, usedBackupCode: true };
    }
  }

  return { ok: false, usedBackupCode: false };
}

/** Disable 2FA. Requires a valid token to prevent session-hijack misuse. */
export async function disableTwoFactor(userId: string, token: string) {
  const result = await verifyTwoFactorLogin(userId, token);
  if (!result.ok) {
    throw new TwoFactorError("Invalid verification code.", 401);
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: { twoFactorEnabled: false },
      $unset: { twoFactorSecret: "", twoFactorBackupCodes: "" },
    },
  );

  return { ok: true };
}

/** Regenerate backup codes. Requires a valid TOTP. */
export async function regenerateBackupCodes(userId: string, token: string) {
  const user = await User.findById(userId)
    .select("+twoFactorSecret twoFactorEnabled")
    .lean();

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new TwoFactorError("Two-factor authentication is not enabled.", 409);
  }
  if (!verifyTotp(user.twoFactorSecret, token)) {
    throw new TwoFactorError("Invalid verification code.", 401);
  }

  const codes = generateBackupCodes(10);
  const hashed = codes.map(hashBackupCode);

  await User.updateOne(
    { _id: userId },
    { $set: { twoFactorBackupCodes: hashed } },
  );

  return { backupCodes: codes };
}

void mongoose;
