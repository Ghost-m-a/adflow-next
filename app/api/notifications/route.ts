import { NextResponse } from "next/server";
import {
  AuthenticationError,
  requireSession,
} from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/db/mongodb";
import Notification from "@/models/Notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: session.userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .select("_id type title message href readAt createdAt")
        .lean(),
      Notification.countDocuments({
        userId: session.userId,
        readAt: null,
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((item) => ({
        id: item._id.toString(),
        type: item.type,
        title: item.title,
        message: item.message,
        href: item.href || "",
        readAt: item.readAt ?? null,
        createdAt: item.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Loading notifications failed:", error);
    return NextResponse.json(
      { error: "Unable to load notifications." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));

    if (body?.action !== "mark-all-read") {
      return NextResponse.json(
        { error: "Unsupported notification action." },
        { status: 400 },
      );
    }

    await Notification.updateMany(
      { userId: session.userId, readAt: null },
      { $set: { readAt: new Date() } },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Marking notifications as read failed:", error);
    return NextResponse.json(
      { error: "Unable to update notifications." },
      { status: 500 },
    );
  }
}
