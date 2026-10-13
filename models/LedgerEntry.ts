import mongoose, { Schema, type Model } from "mongoose";

export const LEDGER_TYPES = [
  "credit",
  "debit",
  "fee",
  "adjustment",
  "reversal",
] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const LEDGER_STATUSES = [
  "pending",
  "available",
  "held",
  "paid",
  "void",
] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];

export interface LedgerEntryDocument extends mongoose.Document {
  organizationId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  conversionId?: mongoose.Types.ObjectId;
  payoutId?: mongoose.Types.ObjectId;
  type: LedgerType;
  status: LedgerStatus;
  amount: number;
  currency: string;
  reference: string;
  description?: string;
  metadata?: Record<string, unknown>;
  availableAt?: Date;
  heldAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<LedgerEntryDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    conversionId: { type: Schema.Types.ObjectId, ref: "Conversion", index: true },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout", index: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    status: {
      type: String,
      enum: LEDGER_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    reference: { type: String, required: true, maxlength: 120 },
    description: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
    availableAt: { type: Date },
    heldAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

LedgerEntrySchema.index({ userId: 1, status: 1, createdAt: -1 });
LedgerEntrySchema.index({ userId: 1, currency: 1, status: 1 });
LedgerEntrySchema.index({ organizationId: 1, status: 1, createdAt: -1 });

const LedgerEntry: Model<LedgerEntryDocument> =
  (mongoose.models.LedgerEntry as Model<LedgerEntryDocument> | undefined) ??
  mongoose.model<LedgerEntryDocument>("LedgerEntry", LedgerEntrySchema);

export default LedgerEntry;
