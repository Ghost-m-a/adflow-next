import mongoose, { Schema, type Model } from "mongoose";

/**
 * Pre-computed per-campaign, per-day rollup. Written by the daily
 * rollups job and read by the analytics service for older ranges.
 *
 * One row per (campaignId, date) — where date is YYYY-MM-DD UTC.
 */
export interface DailyCampaignStatsDocument extends mongoose.Document {
  campaignId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  currency: string;
  date: string;

  clicks: number;
  conversions: number;
  approved: number;
  pending: number;
  rejected: number;
  reversed: number;

  spend: number;
  fees: number;

  createdAt: Date;
  updatedAt: Date;
}

const DailyCampaignStatsSchema = new Schema<DailyCampaignStatsDocument>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },

    clicks: { type: Number, default: 0, min: 0 },
    conversions: { type: Number, default: 0, min: 0 },
    approved: { type: Number, default: 0, min: 0 },
    pending: { type: Number, default: 0, min: 0 },
    rejected: { type: Number, default: 0, min: 0 },
    reversed: { type: Number, default: 0, min: 0 },

    spend: { type: Number, default: 0, min: 0 },
    fees: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

// One row per campaign per day.
DailyCampaignStatsSchema.index(
  { campaignId: 1, date: 1 },
  { unique: true },
);

// Analytics aggregation across a date range.
DailyCampaignStatsSchema.index({ organizationId: 1, date: -1 });

const DailyCampaignStats: Model<DailyCampaignStatsDocument> =
  (mongoose.models.DailyCampaignStats as
    | Model<DailyCampaignStatsDocument>
    | undefined) ??
  mongoose.model<DailyCampaignStatsDocument>(
    "DailyCampaignStats",
    DailyCampaignStatsSchema,
  );

export default DailyCampaignStats;
