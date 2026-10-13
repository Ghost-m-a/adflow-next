import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";

import EmailToken, { type EmailTokenPurpose } from "@/models/EmailToken";
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
import {
  type EmailCategory,
  type EmailPreferenceKey,
  normalizePreferences,
} from "@/lib/email/preferences";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";

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
   Preference helpers
============================================================ */

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

/**
 * Returns the user's preference for a category, defaulting to opt-in.
 * Transactional categories always return true.
 */
export async function canSendToUser(
  userId: string,
  category: EmailCategory,
): Promise<{ allowed: boolean; email?: string; name?: string }> {
  const user = await User.findById(userId)
    .select("email name emailPreferences isActive")
    .lean();

  if (!user || !user.isActive) return { allowed: false };
  if (category === "transactional") {
    return { allowed: true, email: user.email, name: user.name };
  }

  const prefs = normalizePreferences(user.emailPreferences);
  const allowed = prefs[category as EmailPreferenceKey] !== false;
  return { allowed, email: user.email, name: user.name };
}

/**
 * Builds the unsubscribe URL for a user + category, or returns
 * undefined for transactional sends.
 */
async function unsubUrlFor(
  userId: string,
  category: EmailCategory,
): Promise<string | undefined> {
  if (category === "transactional") return undefined;
  return buildUnsubscribeUrl({
    userId,
    category,
    appUrl: appUrl(),
  });
}

/* ============================================================
   High-level senders
============================================================ */

export async function sendWelcomeEmail(userId: string) {
  const { allowed, email, name } = await canSendToUser(userId, "productUpdates");
  if (!allowed || !email) return;

  const rendered = welcomeEmail({
    name: name ?? "there",
    unsubscribeUrl: await unsubUrlFor(userId, "productUpdates"),
  });
  await sendEmail({ to: email, ...rendered, category: "productUpdates" });
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
  await sendEmail({
    to: user.email,
    ...rendered,
    category: "transactional",
  });
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
  await sendEmail({
    to: user.email,
    ...rendered,
    category: "transactional",
  });
}

export async function sendOrganizationInvitationEmail(input: {
  to: string;
  userId?: string;
  organizationName: string;
  role: string;
  inviterName: string;
  acceptUrl: string;
}) {
  // If we know the target user, respect their preference.
  if (input.userId) {
    const { allowed } = await canSendToUser(input.userId, "campaigns");
    if (!allowed) return;
  }

  const rendered = organizationInvitationEmail({
    organizationName: input.organizationName,
    role: input.role,
    inviterName: input.inviterName,
    acceptUrl: input.acceptUrl,
    unsubscribeUrl: input.userId
      ? await unsubUrlFor(input.userId, "campaigns")
      : undefined,
  });
  await sendEmail({ to: input.to, ...rendered, category: "campaigns" });
}

export async function sendCampaignInvitationEmail(input: {
  to: string;
  userId: string;
  campaignTitle: string;
  organizationName: string;
  advertiserName: string;
  message?: string;
  acceptUrl: string;
}) {
  const { allowed } = await canSendToUser(input.userId, "campaigns");
  if (!allowed) return;

  const rendered = campaignInvitationEmail({
    campaignTitle: input.campaignTitle,
    organizationName: input.organizationName,
    advertiserName: input.advertiserName,
    message: input.message,
    acceptUrl: input.acceptUrl,
    unsubscribeUrl: await unsubUrlFor(input.userId, "campaigns"),
  });
  await sendEmail({ to: input.to, ...rendered, category: "campaigns" });
}

export async function sendPayoutSentEmail(input: {
  to: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  destinationLabel: string;
  reference: string;
}) {
  const { allowed } = await canSendToUser(input.userId, "payouts");
  if (!allowed) return;

  const rendered = payoutSentEmail({
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    destinationLabel: input.destinationLabel,
    reference: input.reference,
    unsubscribeUrl: await unsubUrlFor(input.userId, "payouts"),
  });
  await sendEmail({ to: input.to, ...rendered, category: "payouts" });
}

export async function sendNotificationDigest(input: {
  to: string;
  userId: string;
  name: string;
  items: Array<{ title: string; message: string; href?: string }>;
}) {
  if (input.items.length === 0) return;

  const { allowed } = await canSendToUser(input.userId, "notificationDigest");
  if (!allowed) return;

  const rendered = notificationDigestEmail({
    name: input.name,
    items: input.items,
    unsubscribeUrl: await unsubUrlFor(input.userId, "notificationDigest"),
  });
  await sendEmail({ to: input.to, ...rendered, category: "notificationDigest" });
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
