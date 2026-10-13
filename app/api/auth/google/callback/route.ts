import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  exchangeCodeForTokens,
  fetchUserInfo,
  verifyIdToken,
  type GoogleUser,
} from "@/lib/auth/google-oauth";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";
import { findOrCreateGoogleUser } from "@/services/google-auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PKCE_COOKIE = "adflow_g_pkce";
const STATE_COOKIE = "adflow_g_state";
const NEXT_COOKIE = "adflow_g_next";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const errorParam = req.nextUrl.searchParams.get("error");

    if (errorParam) {
      return NextResponse.redirect(
        new URL(`/login?error=oauth_denied`, origin),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_missing_params", origin),
      );
    }

    const store = await cookies();
    const storedVerifier = store.get(PKCE_COOKIE)?.value;
    const storedState = store.get(STATE_COOKIE)?.value;
    const next = store.get(NEXT_COOKIE)?.value ?? "/advertiser";

    // Clear the transient cookies regardless of outcome.
    const clearOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };

    if (!storedVerifier || !storedState) {
      const res = NextResponse.redirect(
        new URL("/login?error=oauth_state_missing", origin),
      );
      res.cookies.set(PKCE_COOKIE, "", clearOpts);
      res.cookies.set(STATE_COOKIE, "", clearOpts);
      res.cookies.set(NEXT_COOKIE, "", clearOpts);
      return res;
    }

    if (storedState !== state) {
      const res = NextResponse.redirect(
        new URL("/login?error=oauth_state_mismatch", origin),
      );
      res.cookies.set(PKCE_COOKIE, "", clearOpts);
      res.cookies.set(STATE_COOKIE, "", clearOpts);
      res.cookies.set(NEXT_COOKIE, "", clearOpts);
      return res;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_not_configured", origin),
      );
    }

    // Exchange the auth code for tokens.
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: storedVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });

    // Verify the ID token. Fall back to userinfo if the JWKS
    // verification fails for any reason.
    let googleUser: GoogleUser;
    try {
      googleUser = await verifyIdToken({ idToken: tokens.idToken, clientId });
    } catch (verifyErr) {
      console.warn("ID token verification failed, using userinfo:", verifyErr);
      googleUser = await fetchUserInfo(tokens.accessToken);
    }

    // Find or create the local user.
    await connectToDatabase();
    const { user, isNew, linked } = await findOrCreateGoogleUser(googleUser);

    if (!user.isActive) {
      return NextResponse.redirect(
        new URL("/login?error=account_suspended", origin),
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    // Create the session — identical shape to the password flow.
    const token = await createSessionToken(
      {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
      },
      true, // Google users get a persistent session by default.
    );

    const response = NextResponse.redirect(new URL(next, origin));

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(true),
    );
    response.cookies.set(PKCE_COOKIE, "", clearOpts);
    response.cookies.set(STATE_COOKIE, "", clearOpts);
    response.cookies.set(NEXT_COOKIE, "", clearOpts);

    // Stash a small flag so the destination page can show
    // "Welcome!" vs "Welcome back!" — optional.
    void isNew;
    void linked;

    return response;
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth_callback_failed", origin),
    );
  }
}

void User;
