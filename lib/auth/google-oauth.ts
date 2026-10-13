import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, createRemoteJWKSet } from "jose";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");

/** Google's token issuer. */
const GOOGLE_ISSUER = "https://accounts.google.com";

/* ============================================================
   PKCE helpers
============================================================ */

function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  // 32 bytes → 43 base64url chars, within the RFC 7636 range.
  return base64UrlEncode(randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(16));
}

/* ============================================================
   Authorization URL
============================================================ */

export function buildAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    access_type: "online", // We don't need offline access for sign-in.
    prompt: "select_account", // Let users pick which account each time.
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

/* ============================================================
   Token exchange
============================================================ */

export type GoogleTokens = {
  accessToken: string;
  idToken: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
};

export async function exchangeCodeForTokens(input: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.codeVerifier,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    id_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token || !json.id_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        "Google token exchange failed.",
    );
  }

  return {
    accessToken: json.access_token,
    idToken: json.id_token,
    expiresIn: json.expires_in ?? 3600,
    scope: json.scope ?? "",
    tokenType: json.token_type ?? "Bearer",
  };
}

/* ============================================================
   ID token verification
============================================================ */

export type GoogleUser = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);
  return jwks;
}

/**
 * Verifies the Google ID token signature, issuer, audience, and
 * expiration. Returns the user claims if valid, throws otherwise.
 */
export async function verifyIdToken(input: {
  idToken: string;
  clientId: string;
}): Promise<GoogleUser> {
  const { payload } = await jwtVerify(input.idToken, getJwks(), {
    issuer: [GOOGLE_ISSUER, "accounts.google.com"],
    audience: input.clientId,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";

  if (!sub || !email) {
    throw new Error("Google ID token is missing required claims.");
  }

  return {
    sub,
    email: email.toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: typeof payload.name === "string" ? payload.name : undefined,
    givenName: typeof payload.given_name === "string" ? payload.given_name : undefined,
    familyName:
      typeof payload.family_name === "string" ? payload.family_name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    locale: typeof payload.locale === "string" ? payload.locale : undefined,
  };
}

/**
 * Fallback: fetch userinfo directly. Useful if the ID token
 * verification ever has issues (JWKS cache miss, etc.).
 */
export async function fetchUserInfo(accessToken: string): Promise<GoogleUser> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Unable to fetch Google user info.");
  }

  const json = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    locale?: string;
  };

  if (!json.sub || !json.email) {
    throw new Error("Google userinfo response is missing required fields.");
  }

  return {
    sub: json.sub,
    email: json.email.toLowerCase(),
    emailVerified: Boolean(json.email_verified),
    name: json.name,
    givenName: json.given_name,
    familyName: json.family_name,
    picture: json.picture,
    locale: json.locale,
  };
}
