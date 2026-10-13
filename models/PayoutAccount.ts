import mongoose, { Schema, type Model } from "mongoose";

export const PAYOUT_ACCOUNT_TYPES = [
  "bank_transfer",
  "paypal",
  "wise",
  "stripe_connect",
  "manual",
] as const;
export type PayoutAccountType = (typeof PAYOUT_ACCOUNT_TYPES)[number];

export interface PayoutAccountDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: PayoutAccountType;
  label: string;
  currency: string;
  details: Record<string, string>;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutAccountSchema = new Schema<PayoutAccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: PAYOUT_ACCOUNT_TYPES,
      required: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    // Free-form string map. Never store full account numbers in plain
    // text in production — swap for a provider token reference.
    details: {
      type: Map,
      of: String,
      default: {},
    },
    isDefault: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

PayoutAccountSchema.index({ userId: 1, isDefault: -1, createdAt: -1 });

const PayoutAccount: Model<PayoutAccountDocument> =
  (mongoose.models.PayoutAccount as Model<PayoutAccountDocument> | undefined) ??
  mongoose.model<PayoutAccountDocument>("PayoutAccount", PayoutAccountSchema);

export default PayoutAccount;
