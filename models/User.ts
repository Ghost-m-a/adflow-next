import mongoose, { Model, Schema } from "mongoose";

export type PlatformRole = "user" | "admin";

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
   },
   {
      timestamps: true,
   },
);

const User =
   (mongoose.models.User as Model<IUser> | undefined) ??
   mongoose.model<IUser>("User", UserSchema);

export default User;
