import mongoose, { Schema, type Model } from "mongoose";

export const WEBHOOK_EVENTS = [
  "conversion.created",
  "conversion.approved",
  "conversion.rejected",
  "submission.approved",
  "submission.rejected",
  "payout.paid",
  "payout.failed",
  "invitation.accepted",
] as const;
export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventName[];
  isActive: boolean;
  lastDeliveryAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<WebhookDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      match: /^https:\/\/\S+$/i,
    },
    secret: { type: String, required: true, select: false },
    events: {
      type: [String],
      enum: WEBHOOK_EVENTS,
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
    lastDeliveryAt: { type: Date },
    lastFailureAt: { type: Date },
    consecutiveFailures: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

WebhookSchema.index({ organizationId: 1, isActive: 1 });

const Webhook: Model<WebhookDocument> =
  (mongoose.models.Webhook as Model<WebhookDocument> | undefined) ??
  mongoose.model<WebhookDocument>("Webhook", WebhookSchema);

export default Webhook;
