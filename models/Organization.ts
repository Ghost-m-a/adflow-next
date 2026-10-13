import mongoose, { Schema, type Model } from "mongoose";

export type OrganizationType = "advertiser" | "agency";

export interface OrganizationDocument extends mongoose.Document {
  name: string;
  slug: string;
  type: OrganizationType;
  ownerId: mongoose.Types.ObjectId;
  description?: string;
  website?: string;
  logoUrl?: string;
  defaultCurrency: string;
  isVerified: boolean;
  isSuspended: boolean;

  /* ---------- Agency ---------- */
  isAgency: boolean;
  parentAgencyId?: mongoose.Types.ObjectId;
  clientLabel?: string;

  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      maxlength: 80,
    },

    type: {
      type: String,
      enum: ["advertiser", "agency"],
      default: "advertiser",
      required: true,
    },

    // References the existing User model without replacing it.
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    website: {
      type: String,
      trim: true,
      maxlength: 2048,
    },

    logoUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
    },

    defaultCurrency: {
      type: String,
      uppercase: true,
      trim: true,
      default: "USD",
      minlength: 3,
      maxlength: 3,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* ---------- Agency ---------- */
    isAgency: {
      type: Boolean,
      default: false,
      index: true,
    },
    parentAgencyId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    clientLabel: { type: String, trim: true, maxlength: 120 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

OrganizationSchema.index({ name: "text", description: "text" });

const Organization: Model<OrganizationDocument> =
  (mongoose.models.Organization as Model<OrganizationDocument>) ||
  mongoose.model<OrganizationDocument>(
    "Organization",
    OrganizationSchema
  );

export default Organization;
