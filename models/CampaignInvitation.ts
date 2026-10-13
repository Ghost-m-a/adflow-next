import mongoose, { Schema, type Model } from "mongoose";

export const INVITATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "revoked",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export interface CampaignInvitationDocument extends mongoose.Document {
  campaignId: mongoose.Types.ObjectId;
  advertiserOrganizationId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  message?: string;
  status: InvitationStatus;
  applicationId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignInvitationSchema = new Schema<CampaignInvitationDocument>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    advertiserOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: { type: String, maxlength: 1000, trim: true },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "CampaignApplication",
    },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// Only one open invitation per (campaign, creator).
CampaignInvitationSchema.index(
  { campaignId: 1, creatorId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

CampaignInvitationSchema.index({ creatorId: 1, status: 1, createdAt: -1 });

const CampaignInvitation: Model<CampaignInvitationDocument> =
  (mongoose.models.CampaignInvitation as Model<CampaignInvitationDocument> | undefined) ??
  mongoose.model<CampaignInvitationDocument>(
    "CampaignInvitation",
    CampaignInvitationSchema,
  );

export default CampaignInvitation;
