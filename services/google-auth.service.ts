import mongoose from "mongoose";

import User from "@/models/User";
import { suggestUsername } from "@/lib/utils/username";
import type { GoogleUser } from "@/lib/auth/google-oauth";

export class GoogleAuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "GoogleAuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Finds a user by Google ID or email, or creates a new one.
 * - If a user exists with the same googleId, return them.
 * - Else if a user exists with the same email, link the Google ID and return.
 * - Else create a new user with a generated username.
 */
export async function findOrCreateGoogleUser(google: GoogleUser) {
  // 1. Look up by Google ID.
  let user = await User.findOne({ googleId: google.sub });
  if (user) {
    // Refresh profile bits from Google in case they changed.
    let changed = false;
    if (!user.avatarUrl && google.picture) {
      user.avatarUrl = google.picture;
      changed = true;
    }
    if (google.name && !user.name) {
      user.name = google.name;
      changed = true;
    }
    if (changed) await user.save();
    return { user, isNew: false, linked: false };
  }

  // 2. Look up by email — link existing account to Google.
  user = await User.findOne({ email: google.email });
  if (user) {
    user.googleId = google.sub;
    if (google.picture && !user.avatarUrl) user.avatarUrl = google.picture;
    if (!user.isEmailVerified) user.isEmailVerified = true;
    // Password auth accounts keep their passwordHash so they can
    // still sign in either way. OAuth-only accounts stay OAuth-only.
    await user.save();
    return { user, isNew: false, linked: true };
  }

  // 3. Create a new user.
  const username = await generateUniqueUsername(
    google.name || google.email.split("@")[0] || "user",
  );

  try {
    const created = await User.create({
      name: google.name || google.email.split("@")[0] || "User",
      username,
      email: google.email,
      authProvider: "google",
      googleId: google.sub,
      avatarUrl: google.picture || "",
      acceptedTermsAt: new Date(),
      isEmailVerified: google.emailVerified,
      isActive: true,
      emailPreferences: {
        productUpdates: true,
        campaigns: true,
        payouts: true,
        notificationDigest: true,
      },
    });

    return { user: created, isNew: true, linked: false };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new GoogleAuthError(
        "Account creation conflicted with an existing user. Try again.",
        409,
      );
    }
    throw error;
  }
}

/** Generates a username that doesn't collide. Appends random suffix if needed. */
async function generateUniqueUsername(seed: string): Promise<string> {
  const base = suggestUsername(seed).slice(0, 25);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0
        ? base
        : `${base.slice(0, 24)}${Math.floor(Math.random() * 900 + 100)}`;

    const existing = await User.findOne({ username: candidate })
      .select("_id")
      .lean();

    if (!existing) return candidate;
  }

  // Last resort — a longer random suffix.
  return `${base.slice(0, 20)}_${Date.now().toString(36).slice(-4)}`;
}

void mongoose;
