import mongoose, { Schema, type Model } from "mongoose";

export const DELIVERY_STATUSES = ["pending", "delivered", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface WebhookDeliveryDocument extends mongoose.Document {
  webhookId: mongoose.Types.ObjectId;
  event: string;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  attempts: number;
  lastAttemptAt?: Date;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookDeliverySchema = new Schema<WebhookDeliveryDocument>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
      index: true,
    },
    event: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: DELIVERY_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
    responseStatus: { type: Number },
    responseBody: { type: String, maxlength: 2000 },
    error: { type: String, maxlength: 500 },
    deliveredAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

WebhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
WebhookDeliverySchema.index({ status: 1, createdAt: -1 });

const WebhookDelivery: Model<WebhookDeliveryDocument> =
  (mongoose.models.WebhookDelivery as Model<WebhookDeliveryDocument> | undefined) ??
  mongoose.model<WebhookDeliveryDocument>("WebhookDelivery", WebhookDeliverySchema);

export default WebhookDelivery;
