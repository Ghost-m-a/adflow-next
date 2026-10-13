import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  buildAuthorizationUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/auth/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cookies hold the PKCE verifier and state between redirects. */
const PKCE_COOKIE = "adflow_g_pkce";
const STATE_COOKIE = "adflow_g_state";
const NEXT_COOKIE = "adflow_g_next";
const COOKIE_MAX_AGE = 10 * 60; // 10 minutes — plenty for the user to consent.

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Google OAuth is not configured." },
        { status: 503 },
      );
    }

    // Only allow relative redirect targets to avoid open redirects.
    const nextParam = req.nextUrl.searchParams.get("next") ?? "";
    const next =
      nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/advertiser";

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const state = generateState();

    const url = buildAuthorizationUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge: challenge,
    });

    const response = NextResponse.redirect(url);

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    };

    const store = await cookies();
    store.set(PKCE_COOKIE, verifier, cookieOpts);
    store.set(STATE_COOKIE, state, cookieOpts);
    store.set(NEXT_COOKIE, next, cookieOpts);

    // Merge the set-cookies into the response.
    store.getAll().forEach((c) => {
      response.cookies.set(c.name, c.value, cookieOpts);
    });

    return response;
  } catch (error) {
    console.error("Google OAuth start failed:", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth_start_failed", req.url),
    );
  }
}
