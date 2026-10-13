import mongoose, { Schema, type Model } from "mongoose";

export const DEPOSIT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export interface WalletDepositDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: DepositStatus;
  provider: string;
  providerReference?: string;
  providerSessionId?: string;
  checkoutUrl?: string;
  failureReason?: string;
  ledgerEntryId?: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WalletDepositSchema = new Schema<WalletDepositDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true, min: 1, max: 10000000 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    status: {
      type: String,
      enum: DEPOSIT_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    provider: { type: String, required: true },
    providerReference: { type: String, maxlength: 200 },
    providerSessionId: {
      type: String,
      index: true,
      sparse: true,
      maxlength: 200,
    },
    checkoutUrl: { type: String, maxlength: 2048 },
    failureReason: { type: String, maxlength: 500 },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: "LedgerEntry" },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

WalletDepositSchema.index({ organizationId: 1, createdAt: -1 });
WalletDepositSchema.index(
  { ledgerEntryId: 1 },
  {
    unique: true,
    partialFilterExpression: { ledgerEntryId: { $exists: true } },
  },
);

const WalletDeposit: Model<WalletDepositDocument> =
  (mongoose.models.WalletDeposit as Model<WalletDepositDocument> | undefined) ??
  mongoose.model<WalletDepositDocument>("WalletDeposit", WalletDepositSchema);

export default WalletDeposit;
