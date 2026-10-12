import mongoose, { Schema, type Model } from "mongoose";

export const CAMPAIGN_STATUSES = [
  "draft", "active", "paused", "completed", "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_PLATFORMS = [
  "instagram", "tiktok", "youtube", "facebook", "x", "twitch", "blog", "other",
] as const;
export type CampaignPlatform = (typeof CAMPAIGN_PLATFORMS)[number];

export const CAMPAIGN_GOALS = [
  "awareness", "engagement", "traffic", "leads", "sales", "content",
] as const;
export type CampaignGoal = (typeof CAMPAIGN_GOALS)[number];

export interface CampaignDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  brief?: string;
  platform: CampaignPlatform;
  goal: CampaignGoal;
  status: CampaignStatus;
  budget: number;
  currency: string;
  rewardPerCreator: number;
  maxCreators: number;
  targetNiches: string[];
  targetCountries: string[];
  requirements: string[];
  applicationDeadline?: Date;
  startsAt?: Date;
  endsAt?: Date;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<CampaignDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    brief: { type: String, trim: true, maxlength: 10000 },
    platform: {
      type: String,
      enum: CAMPAIGN_PLATFORMS,
      required: true,
    },
    goal: { type: String, enum: CAMPAIGN_GOALS, required: true },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 1,
      max: 100000000,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z]{3}$/,
    },
    rewardPerCreator: {
      type: Number,
      required: true,
      min: 0.01,
      max: 100000000,
    },
    maxCreators: {
      type: Number,
      required: true,
      min: 1,
      max: 1000000,
    },
    targetNiches: { type: [String], default: [] },
    targetCountries: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    applicationDeadline: { type: Date },
    startsAt: { type: Date },
    endsAt: { type: Date },
    isPublic: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, versionKey: false },
);

CampaignSchema.index({ organizationId: 1, createdAt: -1 });
CampaignSchema.index({ status: 1, isPublic: 1, createdAt: -1 });
CampaignSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

const Campaign: Model<CampaignDocument> =
  (mongoose.models.Campaign as Model<CampaignDocument> | undefined) ??
  mongoose.model<CampaignDocument>("Campaign", CampaignSchema);

export default Campaign;
