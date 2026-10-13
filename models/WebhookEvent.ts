import mongoose, { Schema, type Model } from "mongoose";

export const WEBHOOK_STATUSES = ["received", "processed", "failed"] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export interface WebhookEventDocument extends mongoose.Document {
  provider: string;
  eventType: string;
  externalId: string;
  payload: Record<string, unknown>;
  status: WebhookStatus;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
}

const WebhookEventSchema = new Schema<WebhookEventDocument>(
  {
    provider: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    externalId: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: WEBHOOK_STATUSES,
      default: "received",
      required: true,
      index: true,
    },
    error: { type: String, maxlength: 1000 },
    processedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// One record per provider event — this is the webhook-level dedupe.
WebhookEventSchema.index({ provider: 1, externalId: 1 }, { unique: true });

const WebhookEvent: Model<WebhookEventDocument> =
  (mongoose.models.WebhookEvent as Model<WebhookEventDocument> | undefined) ??
  mongoose.model<WebhookEventDocument>("WebhookEvent", WebhookEventSchema);

export default WebhookEvent;
