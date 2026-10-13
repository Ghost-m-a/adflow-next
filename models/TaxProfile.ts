import mongoose, { Schema, type Model } from "mongoose";

export const TAX_FORM_TYPES = ["W-9", "W-8BEN", "W-8BEN-E"] as const;
export type TaxFormType = (typeof TAX_FORM_TYPES)[number];

export const TAX_STATUSES = ["pending", "approved", "rejected"] as const;
export type TaxStatus = (typeof TAX_STATUSES)[number];

export interface TaxProfileDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  formType: TaxFormType;
  legalName: string;
  businessName?: string;
  country: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
  };
  /** AES-256-GCM encrypted TIN. Never returned in responses. */
  tinEncrypted: string;
  /** Last 4 digits for display. */
  tinLast4: string;
  /** Whether the creator is a US person (determines W-9 vs W-8). */
  isUsPerson: boolean;
  /** Treaty benefits claimed on W-8BEN (if any). */
  treatyCountry?: string;
  signatureName: string;
  signedAt: Date;
  status: TaxStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaxProfileSchema = new Schema<TaxProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    formType: { type: String, enum: TAX_FORM_TYPES, required: true },
    legalName: { type: String, required: true, trim: true, maxlength: 200 },
    businessName: { type: String, trim: true, maxlength: 200 },
    country: {
      type: String,
      required: true,
      uppercase: true,
      length: 2,
    },
    address: {
      line1: { type: String, required: true, maxlength: 200 },
      line2: { type: String, maxlength: 200 },
      city: { type: String, required: true, maxlength: 100 },
      state: { type: String, maxlength: 100 },
      postalCode: { type: String, required: true, maxlength: 20 },
    },
    tinEncrypted: { type: String, required: true, select: false },
    tinLast4: { type: String, required: true, length: 4 },
    isUsPerson: { type: Boolean, required: true },
    treatyCountry: { type: String, uppercase: true, length: 2 },
    signatureName: { type: String, required: true, maxlength: 200 },
    signedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: TAX_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, maxlength: 500 },
  },
  { timestamps: true, versionKey: false },
);

TaxProfileSchema.index({ status: 1, createdAt: -1 });

const TaxProfile: Model<TaxProfileDocument> =
  (mongoose.models.TaxProfile as Model<TaxProfileDocument> | undefined) ??
  mongoose.model<TaxProfileDocument>("TaxProfile", TaxProfileSchema);

export default TaxProfile;
