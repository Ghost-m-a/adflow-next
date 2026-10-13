import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import User from "@/models/User";
import {
  EMAIL_PREFERENCE_KEYS,
  normalizePreferences,
} from "@/lib/email/preferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const user = await User.findById(session.userId)
      .select("emailPreferences email name")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      preferences: normalizePreferences(user.emailPreferences),
      email: user.email,
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const update: Record<string, boolean> = {};
    for (const key of EMAIL_PREFERENCE_KEYS) {
      const value = (body as Record<string, unknown>)[key];
      if (typeof value === "boolean") {
        update[`emailPreferences.${key}`] = value;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No preference fields provided." },
        { status: 400 },
      );
    }

    await User.updateOne({ _id: session.userId }, { $set: update });

    const user = await User.findById(session.userId)
      .select("emailPreferences")
      .lean();

    return NextResponse.json({
      preferences: normalizePreferences(user?.emailPreferences),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
