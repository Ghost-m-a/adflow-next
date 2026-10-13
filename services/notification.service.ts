import mongoose from "mongoose";
import Notification, { type NotificationType } from "@/models/Notification";

export type NotifyInput = {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
};

export async function notify(input: NotifyInput) {
  return Notification.create({
    userId:
      typeof input.userId === "string"
        ? new mongoose.Types.ObjectId(input.userId)
        : input.userId,
    type: input.type,
    title: input.title.slice(0, 140),
    message: input.message.slice(0, 1000),
    href: input.href?.slice(0, 500),
  });
}

/** Fire-and-forget notification. Never throws — logs on failure. */
export function notifySafe(input: NotifyInput) {
  void notify(input).catch((err) => {
    console.error("notifySafe failed:", err);
  });
}
