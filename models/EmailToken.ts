import mongoose, { Schema, type Model } from "mongoose";

export const EMAIL_TOKEN_PURPOSES = [
  "verify_email",
  "reset_password",
] as const;
export type EmailTokenPurpose = (typeof EMAIL_TOKEN_PURPOSES)[number];

export interface EmailTokenDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  purpose: EmailTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}

const EmailTokenSchema = new Schema<EmailTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: EMAIL_TOKEN_PURPOSES,
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

EmailTokenSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

const EmailToken: Model<EmailTokenDocument> =
  (mongoose.models.EmailToken as Model<EmailTokenDocument> | undefined) ??
  mongoose.model<EmailTokenDocument>("EmailToken", EmailTokenSchema);

export default EmailToken;
