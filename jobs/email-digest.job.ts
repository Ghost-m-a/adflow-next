import mongoose from "mongoose";

import User from "@/models/User";
import Notification from "@/models/Notification";
import { sendNotificationDigest } from "@/services/email.service";
import { normalizePreferences } from "@/lib/email/preferences";

export type DigestRunResult = {
  candidates: number;
  sent: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
};

/**
 * Sends a per-user digest of unread notifications to every eligible
 * user. A user is skipped if:
 *   - they disabled the notificationDigest preference
 *   - they already got a digest in the last 20 hours
 *   - they have no unread notifications
 *
 * Bounded by `maxUsers` to keep a single run cheap. For larger
 * deployments, page through with a cursor.
 */
export async function runEmailDigest(input: {
  maxUsers?: number;
  hoursSinceLastDigest?: number;
} = {}): Promise<DigestRunResult> {
  const max = Math.min(input.maxUsers ?? 200, 500);
  const hours = input.hoursSinceLastDigest ?? 20;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Find users with unread notifications who haven't received a
  // digest recently and haven't opted out.
  const candidates = await User.find({
    isActive: true,
    "emailPreferences.notificationDigest": { $ne: false },
    $or: [
      { lastDigestAt: { $exists: false } },
      { lastDigestAt: { $lt: since } },
    ],
  })
    .select("_id email name emailPreferences")
    .limit(max)
    .lean();

  const result: DigestRunResult = {
    candidates: candidates.length,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  for (const user of candidates) {
    try {
      const prefs = normalizePreferences(user.emailPreferences);
      if (!prefs.notificationDigest) {
        result.skipped += 1;
        continue;
      }

      const unread = await Notification.find({
        userId: user._id,
        readAt: null,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("title message href")
        .lean();

      if (unread.length === 0) {
        result.skipped += 1;
        continue;
      }

      await sendNotificationDigest({
        to: user.email,
        userId: user._id.toString(),
        name: user.name ?? "there",
        items: unread.map((n) => ({
          title: n.title,
          message: n.message,
          href: n.href ?? undefined,
        })),
      });

      await User.updateOne(
        { _id: user._id },
        { $set: { lastDigestAt: new Date() } },
      );

      result.sent += 1;
    } catch (error) {
      result.errors.push({
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  void mongoose; // keep import for future cursor typing
  return result;
}
