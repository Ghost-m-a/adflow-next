import { SignJWT, jwtVerify } from "jose";

import type { EmailCategory } from "./preferences";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET must be configured with at least 32 characters.",
  );
}
const secret = new TextEncoder().encode(SESSION_SECRET);

export type UnsubscribePayload = {
  userId: string;
  category: EmailCategory | "all";
};

/**
 * Signs a token that lets a recipient opt out of a specific email
 * category — or all categories — without signing in.
 *
 * Tokens are HMAC-SHA256 signed JWTs, valid for 1 year. They're
 * stateless: nothing is stored in the DB. Revoking a token is
 * equivalent to disabling the preference, which the settings page
 * can do.
 */
export async function createUnsubscribeToken(
  payload: UnsubscribePayload,
): Promise<string> {
  return new SignJWT({ cat: payload.category })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(secret);
}

export async function verifyUnsubscribeToken(
  token: string,
): Promise<UnsubscribePayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || typeof payload.cat !== "string") {
      return null;
    }

    const validCategories: Array<EmailCategory | "all"> = [
      "productUpdates",
      "campaigns",
      "payouts",
      "notificationDigest",
      "transactional",
      "all",
    ];

    if (!validCategories.includes(payload.cat as EmailCategory | "all")) {
      return null;
    }

    return {
      userId: payload.sub,
      category: payload.cat as EmailCategory | "all",
    };
  } catch {
    return null;
  }
}

/** Builds the public unsubscribe URL that goes in the email footer. */
export async function buildUnsubscribeUrl(input: {
  userId: string;
  category: EmailCategory | "all";
  appUrl: string;
}): Promise<string> {
  const token = await createUnsubscribeToken({
    userId: input.userId,
    category: input.category,
  });
  const base = input.appUrl.replace(/\/+$/, "");
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}
