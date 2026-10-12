import mongoose, { Schema, type Model } from "mongoose";

export interface CreatorProfileDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  country?: string;
  languages: string[];
  niches: string[];
  socialLinks: {
    platform: string;
    url: string;
    handle?: string;
  }[];
  isPublic: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SocialLinkSchema = new Schema(
  {
    platform: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 40,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    handle: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false }
);

const CreatorProfileSchema = new Schema<CreatorProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
    },

    country: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 2,
    },

    languages: {
      type: [String],
      default: [],
    },

    niches: {
      type: [String],
      default: [],
    },

    socialLinks: {
      type: [SocialLinkSchema],
      default: [],
    },

    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

CreatorProfileSchema.index({ niches: 1, isPublic: 1 });

const CreatorProfile: Model<CreatorProfileDocument> =
  (mongoose.models.CreatorProfile as Model<CreatorProfileDocument>) ||
  mongoose.model<CreatorProfileDocument>(
    "CreatorProfile",
    CreatorProfileSchema
  );

export default CreatorProfile;
