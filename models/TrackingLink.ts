import mongoose, { Schema, type Model } from "mongoose";

export interface TrackingLinkDocument extends mongoose.Document {
  campaignId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  creatorProfileId: mongoose.Types.ObjectId;
  tokenHash: string;
  tokenPlain: string;
  destinationUrl: string;
  clicks: number;
  conversions: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingLinkSchema = new Schema<TrackingLinkDocument>(
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
    creatorProfileId: {
      type: Schema.Types.ObjectId,
      ref: "CreatorProfile",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
      index: true,
    },
    // The raw token is stored so the owning creator can re-copy their
    // link. Never expose it in public responses — only to the owner and
    // to the advertiser who issued it.
    tokenPlain: {
      type: String,
      required: true,
      select: false,
    },
    destinationUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    clicks: { type: Number, default: 0, min: 0 },
    conversions: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

// One link per creator per campaign.
TrackingLinkSchema.index(
  { campaignId: 1, creatorId: 1 },
  { unique: true },
);

const TrackingLink: Model<TrackingLinkDocument> =
  (mongoose.models.TrackingLink as Model<TrackingLinkDocument> | undefined) ??
  mongoose.model<TrackingLinkDocument>("TrackingLink", TrackingLinkSchema);

export default TrackingLink;
