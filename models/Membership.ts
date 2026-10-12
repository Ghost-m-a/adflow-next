import mongoose, { Schema, type Model } from "mongoose";

export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "manager",
  "member",
  "viewer",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export interface MembershipDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: OrganizationRole;
  invitedBy?: mongoose.Types.ObjectId;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<MembershipDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ORGANIZATION_ROLES,
      default: "member",
      required: true,
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One membership per user per organization.
MembershipSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true }
);

MembershipSchema.index({ userId: 1, role: 1 });

const Membership: Model<MembershipDocument> =
  (mongoose.models.Membership as Model<MembershipDocument>) ||
  mongoose.model<MembershipDocument>("Membership", MembershipSchema);

export default Membership;
