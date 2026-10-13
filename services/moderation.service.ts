import mongoose from "mongoose";

import Campaign from "@/models/Campaign";
import User from "@/models/User";
import Organization from "@/models/Organization";
import { notifySafe } from "@/services/notification.service";

export class ModerationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ModerationError";
    this.statusCode = statusCode;
  }
}

/* ============================================================
   Campaign moderation
============================================================ */

/** Pending review queue for admins. */
export async function listPendingCampaigns(limit = 100) {
  const campaigns = await Campaign.find({ moderationStatus: "pending" })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 300))
    .lean();

  const orgIds = [...new Set(campaigns.map((c) => c.organizationId.toString()))];
  const orgs = await Organization.find({ _id: { $in: orgIds } })
    .select("_id name slug")
    .lean();
  const orgMap = new Map(orgs.map((o) => [o._id.toString(), o]));

  return campaigns.map((c) => ({
    _id: c._id.toString(),
    title: c.title,
    slug: c.slug,
    description: c.description,
    status: c.status,
    moderationStatus: c.moderationStatus,
    organization: orgMap.get(c.organizationId.toString()) ?? null,
    budget: c.budget,
    currency: c.currency,
    createdAt: c.createdAt,
    coverImageUrl: c.coverImageUrl ?? "",
    category: c.category ?? "",
  }));
}

/** Campaigns rejected in the recent past — for a "rejected" tab. */
export async function listRejectedCampaigns(limit = 100) {
  const campaigns = await Campaign.find({ moderationStatus: "rejected" })
    .sort({ moderatedAt: -1 })
    .limit(Math.min(limit, 300))
    .lean();

  const orgIds = [...new Set(campaigns.map((c) => c.organizationId.toString()))];
  const orgs = await Organization.find({ _id: { $in: orgIds } })
    .select("_id name slug")
    .lean();
  const orgMap = new Map(orgs.map((o) => [o._id.toString(), o]));

  return campaigns.map((c) => ({
    _id: c._id.toString(),
    title: c.title,
    slug: c.slug,
    status: c.status,
    moderationStatus: c.moderationStatus,
    moderationNotes: c.moderationNotes ?? "",
    moderatedAt: c.moderatedAt ?? null,
    organization: orgMap.get(c.organizationId.toString()) ?? null,
    createdAt: c.createdAt,
  }));
}

export async function approveCampaign(campaignId: string, adminId: string) {
  if (!mongoose.isValidObjectId(campaignId)) {
    throw new ModerationError("Invalid campaign.", 400);
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new ModerationError("Campaign not found.", 404);

  if (campaign.moderationStatus !== "pending") {
    throw new ModerationError(
      `Campaign is not awaiting review (current: ${campaign.moderationStatus}).`,
      409,
    );
  }

  campaign.moderationStatus = "approved";
  campaign.moderationNotes = undefined;
  campaign.moderatedBy = new mongoose.Types.ObjectId(adminId);
  campaign.moderatedAt = new Date();
  campaign.status = "active";
  await campaign.save();

  // Notify the campaign owner.
  notifySafe({
    userId: campaign.createdBy,
    type: "campaign",
    title: "Campaign approved",
    message: `"${campaign.title}" is now live and visible in the marketplace.`,
    href: `/advertiser/campaigns/${campaign._id.toString()}`,
  });

  return campaign;
}

export async function rejectCampaign(
  campaignId: string,
  adminId: string,
  reason: string,
) {
  if (!mongoose.isValidObjectId(campaignId)) {
    throw new ModerationError("Invalid campaign.", 400);
  }
  if (!reason || reason.trim().length < 5) {
    throw new ModerationError("A reason of at least 5 characters is required.", 400);
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new ModerationError("Campaign not found.", 404);

  if (campaign.moderationStatus !== "pending") {
    throw new ModerationError(
      `Campaign is not awaiting review (current: ${campaign.moderationStatus}).`,
      409,
    );
  }

  campaign.moderationStatus = "rejected";
  campaign.moderationNotes = reason.slice(0, 2000);
  campaign.moderatedBy = new mongoose.Types.ObjectId(adminId);
  campaign.moderatedAt = new Date();
  campaign.status = "draft";
  await campaign.save();

  notifySafe({
    userId: campaign.createdBy,
    type: "campaign",
    title: "Campaign needs changes",
    message: `"${campaign.title}" was not approved: ${reason.slice(0, 200)}`,
    href: `/advertiser/campaigns/${campaign._id.toString()}`,
  });

  return campaign;
}

/* ============================================================
   User suspension
============================================================ */

export async function suspendUser(input: {
  userId: string;
  adminId: string;
  reason: string;
}) {
  if (!mongoose.isValidObjectId(input.userId)) {
    throw new ModerationError("Invalid user.", 400);
  }
  if (!input.reason || input.reason.trim().length < 5) {
    throw new ModerationError("A reason of at least 5 characters is required.", 400);
  }

  const user = await User.findById(input.userId);
  if (!user) throw new ModerationError("User not found.", 404);
  if (user.platformRole === "admin") {
    throw new ModerationError(
      "Administrator accounts cannot be suspended from this panel.",
      409,
    );
  }
  if (!user.isActive) {
    throw new ModerationError("User is already suspended.", 409);
  }

  user.isActive = false;
  await user.save();

  notifySafe({
    userId: user._id.toString(),
    type: "system",
    title: "Account suspended",
    message: `Your account has been suspended. Reason: ${input.reason.slice(0, 200)}`,
  });

  return { userId: user._id.toString(), reason: input.reason };
}

export async function unsuspendUser(userId: string) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new ModerationError("Invalid user.", 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new ModerationError("User not found.", 404);
  if (user.isActive) {
    throw new ModerationError("User is not suspended.", 409);
  }

  user.isActive = true;
  await user.save();

  notifySafe({
    userId: user._id.toString(),
    type: "system",
    title: "Account restored",
    message: "Your ADFLOW account has been restored.",
  });

  return { userId: user._id.toString() };
}

/** List all non-admin users, filterable by suspended status. */
export async function listUsersForModeration(input: {
  status?: "all" | "active" | "suspended";
  q?: string;
  limit?: number;
}) {
  const filter: Record<string, unknown> = { platformRole: { $ne: "admin" } };

  if (input.status === "active") filter.isActive = true;
  else if (input.status === "suspended") filter.isActive = false;

  if (input.q && input.q.trim()) {
    const rx = new RegExp(
      input.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ username: rx }, { email: rx }, { name: rx }];
  }

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(input.limit ?? 100, 300))
    .select("_id name username email isActive platformRole createdAt lastLoginAt")
    .lean();

  return users.map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    username: u.username,
    email: u.email,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? null,
  }));
}
