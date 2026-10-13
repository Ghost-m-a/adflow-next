import mongoose, { Schema, type Model } from "mongoose";

export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "twitch",
  "blog",
  "other",
] as const;
export type CampaignPlatform = (typeof CAMPAIGN_PLATFORMS)[number];

export const CAMPAIGN_GOALS = [
  "awareness",
  "engagement",
  "traffic",
  "leads",
  "sales",
  "content",
] as const;
export type CampaignGoal = (typeof CAMPAIGN_GOALS)[number];

export const CAMPAIGN_REWARD_MODELS = [
  "per_creator",
  "cpm",
  "hybrid",
] as const;
export type CampaignRewardModel = (typeof CAMPAIGN_REWARD_MODELS)[number];

export const CAMPAIGN_ATTRIBUTION_MODELS = [
  "last_click",
  "first_click",
  "linear",
  "time_decay",
] as const;
export type CampaignAttributionModel =
  (typeof CAMPAIGN_ATTRIBUTION_MODELS)[number];

export const CAMPAIGN_MODERATION_STATUSES = [
  "not_required",
  "pending",
  "approved",
  "rejected",
] as const;
export type CampaignModerationStatus =
  (typeof CAMPAIGN_MODERATION_STATUSES)[number];

export interface CampaignDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  title: string;
  slug: string;
  description: string;
  brief?: string;

  platform: CampaignPlatform;
  supportedPlatforms: string[];
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

  /* ---------- Whop-style Content Rewards fields ---------- */
  coverImageUrl?: string;
  logoUrl?: string;
  category?: string;
  hashtags: string[];
  rewardModel: CampaignRewardModel;
  rewardPerThousand?: number;
  rewardPerVideo?: number;
  minimumPayout: number;
  referenceMaterials: string[];

  /* ---------- Attribution ---------- */
  attributionModel: CampaignAttributionModel;

  /* ---------- Moderation ---------- */
  moderationStatus: CampaignModerationStatus;
  moderationNotes?: string;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;

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
    supportedPlatforms: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) =>
          Array.isArray(v) && v.every((p) => typeof p === "string" && p.length <= 40),
        message: "Platform names must be 40 characters or fewer.",
      },
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
      min: 0,
      max: 100000000,
      default: 0,
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

    /* ---------- Whop-style Content Rewards fields ---------- */
    coverImageUrl: { type: String, trim: true, maxlength: 2048 },
    logoUrl: { type: String, trim: true, maxlength: 2048 },
    category: { type: String, trim: true, maxlength: 60, index: true },
    hashtags: { type: [String], default: [] },
    rewardModel: {
      type: String,
      enum: CAMPAIGN_REWARD_MODELS,
      default: "per_creator",
      required: true,
    },
    rewardPerThousand: { type: Number, min: 0, max: 100000000 },
    rewardPerVideo: { type: Number, min: 0, max: 100000000 },
    minimumPayout: { type: Number, min: 0, max: 100000000, default: 0 },
    referenceMaterials: { type: [String], default: [] },

    /* ---------- Attribution ---------- */
    attributionModel: {
      type: String,
      enum: CAMPAIGN_ATTRIBUTION_MODELS,
      default: "last_click",
      required: true,
    },

    /* ---------- Moderation ---------- */
    moderationStatus: {
      type: String,
      enum: CAMPAIGN_MODERATION_STATUSES,
      default: "not_required",
      required: true,
      index: true,
    },
    moderationNotes: { type: String, maxlength: 2000 },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

CampaignSchema.index({ organizationId: 1, createdAt: -1 });
CampaignSchema.index({ status: 1, isPublic: 1, createdAt: -1 });
CampaignSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
CampaignSchema.index({ category: 1, status: 1, createdAt: -1 });
CampaignSchema.index({ moderationStatus: 1, createdAt: -1 });

const Campaign: Model<CampaignDocument> =
  (mongoose.models.Campaign as Model<CampaignDocument> | undefined) ??
  mongoose.model<CampaignDocument>("Campaign", CampaignSchema);

export default Campaign;
