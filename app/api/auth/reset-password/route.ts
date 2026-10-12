import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSameOrigin } from "@/lib/auth/requireSameOrigin";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("token" in body) ||
      typeof body.token !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.token) ||
      !("password" in body) ||
      typeof body.password !== "string" ||
      !("confirmPassword" in body) ||
      typeof body.confirmPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Please provide a valid reset token and password." },
        { status: 400 },
      );
    }

    const { token, password, confirmPassword } = body;

    if (password.length < 12 || password.length > 128) {
      return NextResponse.json(
        { error: "Your password must be between 12 and 128 characters." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "The passwords do not match." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // findOneAndDelete consumes the token atomically, preventing reuse.
    const resetToken = await PasswordResetToken.findOneAndDelete({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "This reset link is invalid or expired. Please request a new one." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.findOneAndUpdate(
      { _id: resetToken.userId, isActive: true },
      {
        $set: { passwordHash },
        $inc: { sessionVersion: 1 },
      },
      { new: true },
    ).select("_id");

    // Do not leave other outstanding reset links active.
    await PasswordResetToken.deleteMany({ userId: resetToken.userId });

    if (!user) {
      return NextResponse.json(
        { error: "This account cannot be updated. Please contact support." },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      message: "Your password has been changed. Please sign in with your new password.",
    });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      { error: "Unable to reset your password right now. Please try again later." },
      { status: 500 },
    );
  }
}
