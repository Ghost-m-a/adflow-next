import mongoose, { Schema, type Model } from "mongoose";

export const API_SCOPES = [
  "read:campaigns",
  "write:campaigns",
  "read:conversions",
  "write:conversions",
  "read:analytics",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export interface ApiKeyDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  keyHash: string;
  prefix: string;
  scopes: ApiScope[];
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<ApiKeyDocument>(
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
    keyHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
      index: true,
    },
    prefix: { type: String, required: true, maxlength: 20, index: true },
    scopes: {
      type: [String],
      enum: API_SCOPES,
      default: [],
    },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

ApiKeySchema.index({ organizationId: 1, revokedAt: 1 });

const ApiKey: Model<ApiKeyDocument> =
  (mongoose.models.ApiKey as Model<ApiKeyDocument> | undefined) ??
  mongoose.model<ApiKeyDocument>("ApiKey", ApiKeySchema);

export default ApiKey;
