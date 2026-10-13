import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";
import { consumeEmailToken } from "@/services/email.service";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    const consumed = await consumeEmailToken({
      token: parsed.data.token,
      purpose: "verify_email",
    });
    if (!consumed) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 410 },
      );
    }

    await connectToDatabase();
    await User.updateOne(
      { _id: consumed.userId },
      { $set: { isEmailVerified: true } },
    );

    return NextResponse.json({ message: "Email verified." });
  } catch (error) {
    console.error("POST verify-email:", error);
    return NextResponse.json(
      { error: "Unable to verify email." },
      { status: 500 },
    );
  }
}
