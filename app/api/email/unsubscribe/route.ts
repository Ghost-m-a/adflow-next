import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import {
  EMAIL_PREFERENCE_KEYS,
  type EmailPreferenceKey,
} from "@/lib/email/preferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const token = (body as { token?: string } | null)?.token;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token required." }, { status: 400 });
    }

    const payload = await verifyUnsubscribeToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "This unsubscribe link is invalid or has expired." },
        { status: 410 },
      );
    }

    if (payload.category === "transactional") {
      return NextResponse.json(
        { error: "Transactional emails cannot be unsubscribed." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    if (payload.category === "all") {
      const update: Record<string, boolean> = {};
      for (const key of EMAIL_PREFERENCE_KEYS) {
        update[`emailPreferences.${key}`] = false;
      }
      await User.updateOne({ _id: payload.userId }, { $set: update });

      return NextResponse.json({
        message: "You've been unsubscribed from all optional emails.",
        category: "all",
      });
    }

    // Specific category.
    const key = payload.category as EmailPreferenceKey;
    if (!EMAIL_PREFERENCE_KEYS.includes(key)) {
      return NextResponse.json({ error: "Unknown category." }, { status: 400 });
    }

    await User.updateOne(
      { _id: payload.userId },
      { $set: { [`emailPreferences.${key}`]: false } },
    );

    return NextResponse.json({
      message: "You've been unsubscribed from this category.",
      category: key,
    });
  } catch (error) {
    console.error("POST unsubscribe:", error);
    return NextResponse.json(
      { error: "Unable to process unsubscribe." },
      { status: 500 },
    );
  }
}
