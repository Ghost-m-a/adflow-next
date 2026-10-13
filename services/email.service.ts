import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";

import EmailToken, {
  type EmailTokenPurpose,
} from "@/models/EmailToken";
import User from "@/models/User";
import { sendEmail } from "@/lib/email/client";
import {
  campaignInvitationEmail,
  notificationDigestEmail,
  organizationInvitationEmail,
  passwordResetEmail,
  payoutSentEmail,
  verifyEmailTemplate,
  welcomeEmail,
} from "@/lib/email/templates";

/* ============================================================
   Token generation + consumption
============================================================ */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateEmailToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createEmailToken(input: {
  userId: string;
  purpose: EmailTokenPurpose;
  ttlMinutes: number;
}): Promise<string> {
  const token = generateEmailToken();
  const tokenHash = hashToken(token);

  // Invalidate previous unconsumed tokens for the same purpose.
  await EmailToken.updateMany(
    {
      userId: new mongoose.Types.ObjectId(input.userId),
      purpose: input.purpose,
      consumedAt: null,
    },
    { $set: { consumedAt: new Date() } },
  );

  await EmailToken.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    purpose: input.purpose,
    tokenHash,
    expiresAt: new Date(Date.now() + input.ttlMinutes * 60 * 1000),
  });

  return token;
}

export async function consumeEmailToken(input: {
  token: string;
  purpose: EmailTokenPurpose;
}): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(input.token);

  const record = await EmailToken.findOne({
    tokenHash,
    purpose: input.purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select("+tokenHash")
    .lean();

  if (!record) return null;

  const updated = await EmailToken.findOneAndUpdate(
    { _id: record._id, consumedAt: null },
    { $set: { consumedAt: new Date() } },
    { new: true },
  ).lean();

  if (!updated) return null;

  return { userId: record.userId.toString() };
}

/* ============================================================
   High-level senders
============================================================ */

export async function sendWelcomeEmail(userId: string) {
  const user = await User.findById(userId).select("name email").lean();
  if (!user) return;
  const rendered = welcomeEmail({ name: user.name });
  await sendEmail({ to: user.email, ...rendered });
}

export async function sendVerificationEmail(userId: string) {
  const user = await User.findById(userId).select("name email").lean();
  if (!user) return;

  const token = await createEmailToken({
    userId,
    purpose: "verify_email",
    ttlMinutes: 60 * 24,
  });

  const rendered = verifyEmailTemplate({ name: user.name, token });
  await sendEmail({ to: user.email, ...rendered });
}

export async function sendPasswordResetEmail(userId: string) {
  const user = await User.findById(userId).select("name email").lean();
  if (!user) return;

  const token = await createEmailToken({
    userId,
    purpose: "reset_password",
    ttlMinutes: 30,
  });

  const rendered = passwordResetEmail({ name: user.name, token });
  await sendEmail({ to: user.email, ...rendered });
}

export async function sendOrganizationInvitationEmail(input: {
  to: string;
  organizationName: string;
  role: string;
  inviterName: string;
  acceptUrl: string;
}) {
  const rendered = organizationInvitationEmail({
    organizationName: input.organizationName,
    role: input.role,
    inviterName: input.inviterName,
    acceptUrl: input.acceptUrl,
  });
  await sendEmail({ to: input.to, ...rendered });
}

export async function sendCampaignInvitationEmail(input: {
  to: string;
  campaignTitle: string;
  organizationName: string;
  advertiserName: string;
  message?: string;
  acceptUrl: string;
}) {
  const rendered = campaignInvitationEmail(input);
  await sendEmail({ to: input.to, ...rendered });
}

export async function sendPayoutSentEmail(input: {
  to: string;
  name: string;
  amount: number;
  currency: string;
  destinationLabel: string;
  reference: string;
}) {
  const rendered = payoutSentEmail(input);
  await sendEmail({ to: input.to, ...rendered });
}

export async function sendNotificationDigest(input: {
  to: string;
  name: string;
  items: Array<{ title: string; message: string; href?: string }>;
}) {
  if (input.items.length === 0) return;
  const rendered = notificationDigestEmail({ name: input.name, items: input.items });
  await sendEmail({ to: input.to, ...rendered });
}

/** Fire-and-forget version of every sender — never throws. */
export function sendSafe<T extends (...args: never[]) => Promise<void>>(
  fn: T,
  ...args: Parameters<T>
): void {
  void fn(...args).catch((err) => {
    console.error("Email send failed:", err);
  });
}
