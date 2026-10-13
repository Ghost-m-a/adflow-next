import mongoose, { Schema, type Model } from "mongoose";

export const CONVERSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "reversed",
] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];

export const CONVERSION_SOURCES = ["webhook", "api", "manual"] as const;
export type ConversionSource = (typeof CONVERSION_SOURCES)[number];

export interface ConversionDocument extends mongoose.Document {
  idempotencyKey: string;
  campaignId: mongoose.Types.ObjectId;
  creatorId?: mongoose.Types.ObjectId;
  trackingLinkId?: mongoose.Types.ObjectId;
  clickEventId?: mongoose.Types.ObjectId;
  advertiserOrganizationId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: ConversionStatus;
  source: ConversionSource;
  externalId?: string;
  customerRef?: string;
  metadata?: Record<string, unknown>;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionSchema = new Schema<ConversionDocument>(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    trackingLinkId: { type: Schema.Types.ObjectId, ref: "TrackingLink" },
    clickEventId: { type: Schema.Types.ObjectId, ref: "ClickEvent" },
    advertiserOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      max: 100000000,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    status: {
      type: String,
      enum: CONVERSION_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: CONVERSION_SOURCES,
      required: true,
    },
    externalId: { type: String, maxlength: 200 },
    customerRef: { type: String, maxlength: 200 },
    metadata: { type: Schema.Types.Mixed },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
  },
  { timestamps: true, versionKey: false },
);

ConversionSchema.index({ campaignId: 1, status: 1, createdAt: -1 });
ConversionSchema.index({ advertiserOrganizationId: 1, status: 1, createdAt: -1 });

const Conversion: Model<ConversionDocument> =
  (mongoose.models.Conversion as Model<ConversionDocument> | undefined) ??
  mongoose.model<ConversionDocument>("Conversion", ConversionSchema);

export default Conversion;
