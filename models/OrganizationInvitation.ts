import mongoose, { Schema, type Model } from "mongoose";
import type { OrganizationRole } from "@/models/Membership";

export interface OrganizationInvitationDocument
  extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  email: string;
  role: Exclude<OrganizationRole, "owner">;
  tokenHash: string;
  invitedBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationInvitationSchema =
  new Schema<OrganizationInvitationDocument>(
    {
      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
      },
      role: {
        type: String,
        enum: ["admin", "manager", "member", "viewer"],
        required: true,
      },
      tokenHash: {
        type: String,
        required: true,
        unique: true,
        select: false,
      },
      invitedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },
      acceptedAt: {
        type: Date,
        default: null,
      },
      revokedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

OrganizationInvitationSchema.index({
  organizationId: 1,
  email: 1,
  createdAt: -1,
});

const OrganizationInvitation: Model<OrganizationInvitationDocument> =
  (mongoose.models.OrganizationInvitation as Model<OrganizationInvitationDocument>) ||
  mongoose.model<OrganizationInvitationDocument>(
    "OrganizationInvitation",
    OrganizationInvitationSchema
  );

export default OrganizationInvitation;
