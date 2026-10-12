import mongoose, { Schema, type Model } from "mongoose";

export const APPLICATION_STATUSES = [
  "pending", "accepted", "rejected", "withdrawn",
] as const;

export type CampaignApplicationStatus =
  (typeof APPLICATION_STATUSES)[number];

export interface CampaignApplicationDocument extends mongoose.Document {
  campaignId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  creatorProfileId: mongoose.Types.ObjectId;
  message: string;
  proposedRate?: number;
  status: CampaignApplicationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignApplicationSchema =
  new Schema<CampaignApplicationDocument>(
    {
      campaignId: {
        type: Schema.Types.ObjectId,
        ref: "Campaign",
        required: true,
      },
      creatorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      creatorProfileId: {
        type: Schema.Types.ObjectId,
        ref: "CreatorProfile",
        required: true,
      },
      message: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 2000,
      },
      proposedRate: { type: Number, min: 0, max: 100000000 },
      status: {
        type: String,
        enum: APPLICATION_STATUSES,
        default: "pending",
        required: true,
      },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
    },
    { timestamps: true, versionKey: false },
  );

CampaignApplicationSchema.index({ campaignId: 1, createdAt: -1 });
CampaignApplicationSchema.index({ creatorId: 1, createdAt: -1 });
CampaignApplicationSchema.index(
  { campaignId: 1, creatorId: 1 },
  { unique: true },
);

const CampaignApplication: Model<CampaignApplicationDocument> =
  (mongoose.models.CampaignApplication as
    | Model<CampaignApplicationDocument>
    | undefined) ??
  mongoose.model<CampaignApplicationDocument>(
    "CampaignApplication",
    CampaignApplicationSchema,
  );

export default CampaignApplication;
