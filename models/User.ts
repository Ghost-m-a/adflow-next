import mongoose, { Model, Schema } from "mongoose";

export type PlatformRole = "user" | "admin";

export type EmailPreferenceKey =
   | "productUpdates"
   | "campaigns"
   | "payouts"
   | "notificationDigest";

export type EmailPreferences = Record<EmailPreferenceKey, boolean>;

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
   productUpdates: true,
   campaigns: true,
   payouts: true,
   notificationDigest: true,
};

export interface IUser {
   name: string;
   username: string;
   email: string;
   passwordHash: string;
   avatarUrl?: string;
   acceptedTermsAt: Date;
   isEmailVerified: boolean;
   isActive: boolean;
   platformRole: PlatformRole;
   lastLoginAt?: Date;
   emailPreferences: EmailPreferences;
   lastDigestAt?: Date;

   /* ---------- Two-factor authentication ---------- */
   twoFactorEnabled: boolean;
   twoFactorSecret?: string;
   twoFactorBackupCodes: string[];
   twoFactorConfirmedAt?: Date;
   createdAt: Date;
   updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
   {
      name: {
         type: String,
         required: true,
         trim: true,
         maxlength: 100,
      },

      username: {
         type: String,
         required: true,
         trim: true,
         lowercase: true,
         minlength: 3,
         maxlength: 30,
         match: /^[a-z0-9_]+$/,
         unique: true,
      },

      email: {
         type: String,
         required: true,
         trim: true,
         lowercase: true,
         maxlength: 254,
         unique: true,
      },

      passwordHash: {
         type: String,
         required: true,
         select: false,
      },

      avatarUrl: {
         type: String,
         default: "",
      },

      acceptedTermsAt: {
         type: Date,
         required: true,
      },

      isEmailVerified: {
         type: Boolean,
         default: false,
      },

      isActive: {
         type: Boolean,
         default: true,
      },

      platformRole: {
         type: String,
         enum: ["user", "admin"],
         default: "user",
         required: true,
      },

      lastLoginAt: {
         type: Date,
      },

      // Per-user email preferences. Transactional emails (verify,
      // password reset) are always sent and are not represented here.
      emailPreferences: {
         productUpdates: { type: Boolean, default: true },
         campaigns: { type: Boolean, default: true },
         payouts: { type: Boolean, default: true },
         notificationDigest: { type: Boolean, default: true },
      },

      // Used to throttle the notification digest — one send per calendar
      // day per user.
      lastDigestAt: { type: Date },

      /* ---------- Two-factor authentication ---------- */
      twoFactorEnabled: { type: Boolean, default: false, required: true },
      twoFactorSecret: { type: String, select: false },
      twoFactorBackupCodes: {
         type: [String],
         default: [],
         select: false,
      },
      twoFactorConfirmedAt: { type: Date },
   },
   {
      timestamps: true,
   },
);

const User =
   (mongoose.models.User as Model<IUser> | undefined) ??
   mongoose.model<IUser>("User", UserSchema);

export default User;
