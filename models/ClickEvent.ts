import mongoose, { Schema, type Model } from "mongoose";

export interface ClickEventDocument extends mongoose.Document {
  trackingLinkId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  ipHash: string;
  userAgentHash: string;
  fingerprint: string;
  referrer?: string;
  country?: string;
  createdAt: Date;
}

const ClickEventSchema = new Schema<ClickEventDocument>(
  {
    trackingLinkId: {
      type: Schema.Types.ObjectId,
      ref: "TrackingLink",
      required: true,
      index: true,
    },
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
    ipHash: { type: String, default: "" },
    userAgentHash: { type: String, default: "" },
    fingerprint: { type: String, required: true, index: true },
    referrer: { type: String, maxlength: 2048 },
    country: { type: String, maxlength: 2 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

ClickEventSchema.index({ trackingLinkId: 1, createdAt: -1 });
ClickEventSchema.index({ campaignId: 1, createdAt: -1 });
ClickEventSchema.index({ fingerprint: 1, createdAt: -1 });

const ClickEvent: Model<ClickEventDocument> =
  (mongoose.models.ClickEvent as Model<ClickEventDocument> | undefined) ??
  mongoose.model<ClickEventDocument>("ClickEvent", ClickEventSchema);

export default ClickEvent;
