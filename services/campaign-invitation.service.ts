import mongoose from "mongoose";

import CampaignInvitation from "@/models/CampaignInvitation";
import Campaign from "@/models/Campaign";
import CampaignApplication from "@/models/CampaignApplication";
import CreatorProfile from "@/models/CreatorProfile";
import User from "@/models/User";
import Organization from "@/models/Organization";
import { notifySafe } from "@/services/notification.service";
import { sendCampaignInvitationEmail, sendSafe } from "@/services/email.service";

export class InvitationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "InvitationError";
    this.statusCode = statusCode;
  }
}

const EXPIRY_DAYS = 14;

/* ============================================================
   Advertiser → Creator
============================================================ */

export async function createInvitation(input: {
  campaignId: string;
  organizationId: string;
  invitedBy: string;
  creatorId: string;
  message?: string;
  appOrigin: string;
}) {
  if (!mongoose.isValidObjectId(input.campaignId) || !mongoose.isValidObjectId(input.creatorId)) {
    throw new InvitationError("Invalid campaign or creator.", 400);
  }

  const [campaign, creator, profile] = await Promise.all([
    Campaign.findById(input.campaignId).lean(),
    User.findById(input.creatorId).select("_id isActive email name").lean(),
    CreatorProfile.findOne({ userId: input.creatorId })
      .select("_id displayName")
      .lean(),
  ]);

  if (!campaign) throw new InvitationError("Campaign not found.", 404);
  if (!creator || !creator.isActive) {
    throw new InvitationError("Creator not found.", 404);
  }
  if (!profile) {
    throw new InvitationError("Creator has no public profile yet.", 409);
  }

  if (["completed", "cancelled"].includes(campaign.status)) {
    throw new InvitationError(
      "Cannot invite to a completed or cancelled campaign.",
      409,
    );
  }

  // Already applied?
  const existingApp = await CampaignApplication.findOne({
    campaignId: campaign._id,
    creatorId: new mongoose.Types.ObjectId(input.creatorId),
  })
    .select("status")
    .lean();

  if (existingApp) {
    throw new InvitationError(
      `Creator already has an application (${existingApp.status}).`,
      409,
    );
  }

  // Already invited?
  const existingInvite = await CampaignInvitation.findOne({
    campaignId: campaign._id,
    creatorId: new mongoose.Types.ObjectId(input.creatorId),
    status: "pending",
  })
    .select("_id")
    .lean();

  if (existingInvite) {
    throw new InvitationError("An invitation is already pending.", 409);
  }

  const invitation = await CampaignInvitation.create({
    campaignId: campaign._id,
    advertiserOrganizationId: campaign.organizationId,
    invitedBy: new mongoose.Types.ObjectId(input.invitedBy),
    creatorId: new mongoose.Types.ObjectId(input.creatorId),
    message: input.message,
    expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  // Look up advertiser name + org for the email.
  const [org, inviter] = await Promise.all([
    Organization.findById(campaign.organizationId).select("name").lean(),
    User.findById(input.invitedBy).select("name username").lean(),
  ]);

  const advertiserName = inviter?.name || inviter?.username || "An advertiser";

  // In-app notification.
  notifySafe({
    userId: input.creatorId,
    type: "campaign",
    title: "New campaign invitation",
    message: `${org?.name ?? "An advertiser"} invited you to "${campaign.title}".`,
    href: "/creator/invitations",
  });

  // Email.
  if (creator.email) {
    sendSafe(sendCampaignInvitationEmail, {
      to: creator.email,
      campaignTitle: campaign.title,
      organizationName: org?.name ?? "ADFLOW",
      advertiserName,
      message: input.message,
      acceptUrl: `${input.appOrigin}/creator/invitations`,
    });
  }

  return invitation;
}

export async function revokeInvitation(invitationId: string, organizationId: string) {
  if (!mongoose.isValidObjectId(invitationId)) {
    throw new InvitationError("Invalid invitation.", 400);
  }

  const invitation = await CampaignInvitation.findOne({
    _id: invitationId,
    advertiserOrganizationId: organizationId,
    status: "pending",
  });

  if (!invitation) {
    throw new InvitationError("Pending invitation not found.", 404);
  }

  invitation.status = "revoked";
  invitation.respondedAt = new Date();
  await invitation.save();
  return invitation;
}

/* ============================================================
   Creator responses
============================================================ */

export async function acceptInvitation(invitationId: string, creatorId: string) {
  if (!mongoose.isValidObjectId(invitationId)) {
    throw new InvitationError("Invalid invitation.", 400);
  }

  const invitation = await CampaignInvitation.findOne({
    _id: invitationId,
    creatorId: new mongoose.Types.ObjectId(creatorId),
    status: "pending",
  });

  if (!invitation) {
    throw new InvitationError("Invitation not found or already responded.", 404);
  }

  if (invitation.expiresAt <= new Date()) {
    invitation.status = "expired";
    await invitation.save();
    throw new InvitationError("This invitation has expired.", 410);
  }

  const campaign = await Campaign.findById(invitation.campaignId);
  if (!campaign) {
    throw new InvitationError("Campaign not found.", 404);
  }
  if (["completed", "cancelled"].includes(campaign.status)) {
    throw new InvitationError("This campaign is no longer active.", 409);
  }

  // Capacity guard.
  const acceptedCount = await CampaignApplication.countDocuments({
    campaignId: campaign._id,
    status: "accepted",
  });
  if (acceptedCount >= campaign.maxCreators) {
    throw new InvitationError("This campaign is full.", 409);
  }

  // Block duplicate applications.
  const existingApp = await CampaignApplication.findOne({
    campaignId: campaign._id,
    creatorId: new mongoose.Types.ObjectId(creatorId),
  });
  if (existingApp) {
    throw new InvitationError(
      "You already have an application for this campaign.",
      409,
    );
  }

  const profile = await CreatorProfile.findOne({
    userId: new mongoose.Types.ObjectId(creatorId),
  })
    .select("_id")
    .lean();

  if (!profile) {
    throw new InvitationError(
      "Create a creator profile before accepting invitations.",
      409,
    );
  }

  // Create an auto-accepted application.
  const application = await CampaignApplication.create({
    campaignId: campaign._id,
    creatorId: new mongoose.Types.ObjectId(creatorId),
    creatorProfileId: profile._id,
    message: invitation.message || "Accepted invitation.",
    status: "accepted",
    reviewedBy: invitation.invitedBy,
    reviewedAt: new Date(),
  });

  invitation.status = "accepted";
  invitation.applicationId = application._id;
  invitation.respondedAt = new Date();
  await invitation.save();

  // Notify the advertiser.
  notifySafe({
    userId: invitation.invitedBy,
    type: "application",
    title: "Campaign invitation accepted",
    message: `Your invitation to "${campaign.title}" was accepted.`,
    href: `/advertiser/campaigns/${campaign._id.toString()}`,
  });

  return { invitation, applicationId: application._id.toString() };
}

export async function declineInvitation(invitationId: string, creatorId: string) {
  if (!mongoose.isValidObjectId(invitationId)) {
    throw new InvitationError("Invalid invitation.", 400);
  }

  const invitation = await CampaignInvitation.findOne({
    _id: invitationId,
    creatorId: new mongoose.Types.ObjectId(creatorId),
    status: "pending",
  });

  if (!invitation) {
    throw new InvitationError("Invitation not found or already responded.", 404);
  }

  invitation.status = "declined";
  invitation.respondedAt = new Date();
  await invitation.save();

  const campaign = await Campaign.findById(invitation.campaignId)
    .select("title")
    .lean();

  notifySafe({
    userId: invitation.invitedBy,
    type: "application",
    title: "Campaign invitation declined",
    message: `Your invitation to "${campaign?.title ?? "a campaign"}" was declined.`,
    href: `/advertiser/campaigns/${invitation.campaignId.toString()}`,
  });

  return invitation;
}
