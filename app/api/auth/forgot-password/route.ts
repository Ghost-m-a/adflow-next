import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";
import { sendPasswordResetEmail } from "@/services/email.service";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: parsed.data.email })
      .select("_id isActive")
      .lean();

    // Always respond with success to avoid user enumeration.
    if (user && user.isActive) {
      // Fire and forget — the request should not fail if email is slow.
      void sendPasswordResetEmail(user._id.toString()).catch((err) =>
        console.error("Password reset email failed:", err),
      );
    }

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("POST forgot-password:", error);
    return NextResponse.json(
      { error: "Unable to process request." },
      { status: 500 },
    );
  }
}
