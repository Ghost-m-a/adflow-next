import mongoose, { Schema, type Model } from "mongoose";

export const PAYOUT_STATUSES = [
  "requested",
  "processing",
  "paid",
  "failed",
  "cancelled",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const OPEN_PAYOUT_STATUSES: PayoutStatus[] = ["requested", "processing"];

export interface PayoutDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PayoutStatus;
  reference: string;
  provider: string;
  providerReference?: string;
  destinationSnapshot: {
    label: string;
    details: Record<string, string>;
  };
  ledgerEntryIds: mongoose.Types.ObjectId[];
  requestedAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<PayoutDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      index: true,
    },
    status: {
      type: String,
      enum: PAYOUT_STATUSES,
      default: "requested",
      required: true,
      index: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: { type: String, required: true },
    providerReference: { type: String, maxlength: 200 },
    destinationSnapshot: {
      label: { type: String, required: true, maxlength: 200 },
      details: { type: Schema.Types.Mixed, default: {} },
    },
    ledgerEntryIds: {
      type: [Schema.Types.ObjectId],
      ref: "LedgerEntry",
      default: [],
    },
    requestedAt: { type: Date, default: Date.now, required: true },
    processedAt: { type: Date },
    failedAt: { type: Date },
    cancelledAt: { type: Date },
    failureReason: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

// Fast: creator's own payout history.
PayoutSchema.index({ userId: 1, createdAt: -1 });

// Fast: open payouts by status (admin view).
PayoutSchema.index({ status: 1, createdAt: -1 });

// One open payout per user per currency.
PayoutSchema.index(
  { userId: 1, currency: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["requested", "processing"] },
    },
  },
);

const Payout: Model<PayoutDocument> =
  (mongoose.models.Payout as Model<PayoutDocument> | undefined) ??
  mongoose.model<PayoutDocument>("Payout", PayoutSchema);

export default Payout;
