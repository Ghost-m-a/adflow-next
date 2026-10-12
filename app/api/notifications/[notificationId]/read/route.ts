import mongoose from "mongoose";
import { NextResponse } from "next/server";
import {
  AuthenticationError,
  requireSession,
} from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/db/mongodb";
import Notification from "@/models/Notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    const session = await requireSession();
    const { notificationId } = await params;

    if (!mongoose.isValidObjectId(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification ID." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: session.userId },
      { $set: { readAt: new Date() } },
      { new: true },
    ).select("_id readAt");

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      id: notification._id.toString(),
      readAt: notification.readAt,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Marking notification as read failed:", error);
    return NextResponse.json(
      { error: "Unable to update notification." },
      { status: 500 },
    );
  }
}
