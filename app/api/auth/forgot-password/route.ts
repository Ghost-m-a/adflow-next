import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSameOrigin } from "@/lib/auth/requireSameOrigin";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";

export const runtime = "nodejs";

const SUCCESS_MESSAGE =
  "If an account exists for that email, a password-reset link will be sent shortly.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !emailFrom || !appUrl) {
    return NextResponse.json(
      { error: "Password recovery email is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      typeof body.email !== "string" ||
      body.email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();

    await connectToDatabase();

    const user = await User.findOne({ email })
      .select("_id email isActive")
      .lean();

    // Keep the response identical for unknown and disabled accounts.
    if (!user || !user.isActive) {
      return NextResponse.json({ message: SUCCESS_MESSAGE });
    }

    // Avoid repeatedly emailing the same account.
    const recentToken = await PasswordResetToken.findOne({
      userId: user._id,
      createdAt: { $gt: new Date(Date.now() - 60_000) },
    }).select("_id");

    if (recentToken) {
      return NextResponse.json({ message: SUCCESS_MESSAGE });
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    await PasswordResetToken.deleteMany({ userId: user._id });

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const resetUrl = new URL("/reset-password", appUrl);
    resetUrl.searchParams.set("token", token);

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: emailFrom,
      to: user.email,
      subject: "Reset your ADFLOW password",
      text: [
        "We received a request to reset your ADFLOW password.",
        "",
        `Open this link to choose a new password: ${resetUrl.toString()}`,
        "",
        "This link expires in 30 minutes and can only be used once.",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171725">
          <h1>Reset your ADFLOW password</h1>
          <p>We received a request to reset your password.</p>
          <p>
            <a href="${resetUrl.toString()}"
              style="display:inline-block;padding:13px 20px;background:#7c3aed;color:white;text-decoration:none;border-radius:10px">
              Reset password
            </a>
          </p>
          <p>This link expires in 30 minutes and can only be used once.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Password reset email delivery failed:", error);
      await PasswordResetToken.deleteOne({ tokenHash });
    }

    // Do not reveal account existence or email delivery status.
    return NextResponse.json({ message: SUCCESS_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { error: "Unable to process your request right now. Please try again later." },
      { status: 500 },
    );
  }
}
