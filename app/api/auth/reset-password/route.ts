import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";
import { consumeEmailToken } from "@/services/email.service";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: z.string().min(12).max(128),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reset request." }, { status: 400 });
    }

    const consumed = await consumeEmailToken({
      token: parsed.data.token,
      purpose: "reset_password",
    });
    if (!consumed) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 410 },
      );
    }

    await connectToDatabase();
    const user = await User.findById(consumed.userId).select("_id isActive");
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Account is no longer active." },
        { status: 404 },
      );
    }

    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await user.save();

    return NextResponse.json({ message: "Password updated. You can sign in now." });
  } catch (error) {
    console.error("POST reset-password:", error);
    return NextResponse.json(
      { error: "Unable to reset password." },
      { status: 500 },
    );
  }
}
