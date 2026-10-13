import mongoose, { Schema, type Model } from "mongoose";

export const SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "rejected",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_CONTENT_TYPES = [
  "post",
  "video",
  "story",
  "reel",
  "article",
  "newsletter",
  "other",
] as const;
export type SubmissionContentType = (typeof SUBMISSION_CONTENT_TYPES)[number];

export interface ContentSubmissionDocument extends mongoose.Document {
  campaignId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  campaignApplicationId: mongoose.Types.ObjectId;
  trackingLinkId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  contentType: SubmissionContentType;
  contentUrl: string;
  thumbnailUrl?: string;
  rewardAmount: number;
  rewardCurrency: string;
  status: SubmissionStatus;
  submittedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  ledgerEntryId?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ContentSubmissionSchema = new Schema<ContentSubmissionDocument>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaignApplicationId: {
      type: Schema.Types.ObjectId,
      ref: "CampaignApplication",
      required: true,
    },
    trackingLinkId: { type: Schema.Types.ObjectId, ref: "TrackingLink" },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    contentType: {
      type: String,
      enum: SUBMISSION_CONTENT_TYPES,
      required: true,
    },
    contentUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      match: /^https?:\/\/\S+$/i,
    },
    thumbnailUrl: { type: String, trim: true, maxlength: 2048 },
    rewardAmount: { type: Number, required: true, min: 0, max: 100000000 },
    rewardCurrency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    status: {
      type: String,
      enum: SUBMISSION_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    submittedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, maxlength: 2000 },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: "LedgerEntry" },
    approvedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

// Creator's own view.
ContentSubmissionSchema.index({ creatorId: 1, status: 1, createdAt: -1 });

// Advertiser review queue.
ContentSubmissionSchema.index({ campaignId: 1, status: 1, createdAt: -1 });

// Prevent duplicate reward credit for the same submission.
ContentSubmissionSchema.index(
  { ledgerEntryId: 1 },
  {
    unique: true,
    partialFilterExpression: { ledgerEntryId: { $exists: true } },
  },
);

const ContentSubmission: Model<ContentSubmissionDocument> =
  (mongoose.models.ContentSubmission as Model<ContentSubmissionDocument> | undefined) ??
  mongoose.model<ContentSubmissionDocument>(
    "ContentSubmission",
    ContentSubmissionSchema,
  );

export default ContentSubmission;
