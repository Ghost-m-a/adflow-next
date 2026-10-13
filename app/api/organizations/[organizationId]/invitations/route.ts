import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import type { OrganizationRole } from "@/models/Membership";
import Membership from "@/models/Membership";
import Organization from "@/models/Organization";
import OrganizationInvitation from "@/models/OrganizationInvitation";
import User from "@/models/User";
import { sendOrganizationInvitationEmail } from "@/services/email.service";

type RouteContext = {
   params: Promise<{
      organizationId: string;
   }>;
};

type InvitationRole = Exclude<OrganizationRole, "owner">;

const ALLOWED_INVITATION_ROLES = [
   "admin",
   "manager",
   "member",
   "viewer",
] as const satisfies readonly InvitationRole[];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorStatus(error: unknown): number {
   if (
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
   ) {
      return error.statusCode;
   }

   return 500;
}

function errorResponse(error: unknown) {
   const status = getErrorStatus(error);

   const message =
      status < 500 && error instanceof Error
         ? error.message
         : "An unexpected error occurred.";

   return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/organizations/:organizationId/invitations
 *
 * Lists invitations for an organization.
 * Only owners and admins can access this endpoint.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
   try {
      const { organizationId } = await params;

      if (!mongoose.isValidObjectId(organizationId)) {
         return NextResponse.json(
            { error: "Invalid organization ID." },
            { status: 400 },
         );
      }

      await requireOrganizationRole(organizationId, ["owner", "admin"]);

      await connectToDatabase();

      const invitations = await OrganizationInvitation.find({
         organizationId: new mongoose.Types.ObjectId(organizationId),
      })
         .select(
            "_id email role invitedBy expiresAt acceptedAt revokedAt createdAt",
         )
         .sort({ createdAt: -1 })
         .lean();

      const now = new Date();

      const result = invitations.map((invitation) => ({
         _id: invitation._id.toString(),
         email: invitation.email,
         role: invitation.role,
         invitedBy: invitation.invitedBy.toString(),
         expiresAt: invitation.expiresAt,
         acceptedAt: invitation.acceptedAt ?? null,
         revokedAt: invitation.revokedAt ?? null,
         createdAt: invitation.createdAt,
         status: invitation.acceptedAt
            ? "accepted"
            : invitation.revokedAt
              ? "revoked"
              : invitation.expiresAt <= now
                ? "expired"
                : "pending",
      }));

      return NextResponse.json({ invitations: result });
   } catch (error: unknown) {
      return errorResponse(error);
   }
}

/**
 * POST /api/organizations/:organizationId/invitations
 *
 * Creates an invitation.
 * Only owners and admins can invite members.
 * Only owners can grant the admin role.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
   try {
      const { organizationId } = await params;

      if (!mongoose.isValidObjectId(organizationId)) {
         return NextResponse.json(
            { error: "Invalid organization ID." },
            { status: 400 },
         );
      }

      const access = await requireOrganizationRole(organizationId, [
         "owner",
         "admin",
      ]);

      await connectToDatabase();

      let body: unknown;

      try {
         body = await request.json();
      } catch {
         return NextResponse.json(
            { error: "Request body must contain valid JSON." },
            { status: 400 },
         );
      }

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
         return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 },
         );
      }

      const input = body as Record<string, unknown>;

      if (typeof input.email !== "string") {
         return NextResponse.json(
            { error: "A valid email address is required." },
            { status: 400 },
         );
      }

      const email = input.email.trim().toLowerCase();

      if (email.length > 254 || !EMAIL_REGEX.test(email)) {
         return NextResponse.json(
            { error: "Please provide a valid email address." },
            { status: 400 },
         );
      }

      // Explicitly narrow the role to the permitted invitation roles.
      const requestedRole: unknown = input.role;

      if (
         typeof requestedRole !== "string" ||
         !ALLOWED_INVITATION_ROLES.includes(requestedRole as InvitationRole)
      ) {
         return NextResponse.json(
            {
               error: "Invalid role. Choose admin, manager, member, or viewer.",
            },
            { status: 400 },
         );
      }

      const invitationRole: InvitationRole = requestedRole as InvitationRole;

      // Admins cannot grant the admin role.
      if (invitationRole === "admin" && access.role !== "owner") {
         return NextResponse.json(
            {
               error: "Only the organization owner can invite an admin.",
            },
            { status: 403 },
         );
      }

      const organization = await Organization.findById(organizationId)
         .select("_id ownerId isSuspended")
         .lean();

      if (!organization) {
         return NextResponse.json(
            { error: "Organization not found." },
            { status: 404 },
         );
      }

      if (organization.isSuspended) {
         return NextResponse.json(
            { error: "This organization is suspended." },
            { status: 403 },
         );
      }

      // If the email already belongs to an account, check
      // whether that account is already part of this organization.
      const existingUser = await User.findOne({ email })
         .select("_id email")
         .lean();

      if (existingUser) {
         const isOwner =
            organization.ownerId.toString() === existingUser._id.toString();

         if (isOwner) {
            return NextResponse.json(
               {
                  error: "This user already owns the organization.",
               },
               { status: 409 },
            );
         }

         const existingMembership = await Membership.findOne({
            organizationId: organization._id,
            userId: existingUser._id,
         })
            .select("_id")
            .lean();

         if (existingMembership) {
            return NextResponse.json(
               {
                  error: "This user is already a member of the organization.",
               },
               { status: 409 },
            );
         }
      }

      const now = new Date();

      // Do not allow multiple active invitations for the same
      // organization and email address.
      const pendingInvitation = await OrganizationInvitation.findOne({
         organizationId: organization._id,
         email,
         acceptedAt: null,
         revokedAt: null,
         expiresAt: { $gt: now },
      })
         .select("_id")
         .lean();

      if (pendingInvitation) {
         return NextResponse.json(
            {
               error: "An active invitation already exists for this email address.",
            },
            { status: 409 },
         );
      }

      // The raw token is never stored in the database.
      const token = randomBytes(32).toString("hex");

      const tokenHash = createHash("sha256").update(token).digest("hex");

      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await OrganizationInvitation.create({
         organizationId: organization._id,
         email,
         role: invitationRole,
         tokenHash,
         invitedBy: new mongoose.Types.ObjectId(access.session.userId),
         expiresAt,
      });

      const baseUrl = (
         process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      ).replace(/\/+$/, "");

      const invitationUrl =
         `${baseUrl}/organizations/invitations/accept` +
         `?token=${encodeURIComponent(token)}`;

      // Fire-and-forget email.
      void (async () => {
        try {
          const inviter = await User.findById(access.session.userId)
            .select("name username")
            .lean();
          await sendOrganizationInvitationEmail({
            to: email,
            userId: existingUser?._id?.toString(),
            organizationName: organization.name ?? "the organization",
            role: invitationRole,
            inviterName: inviter?.name || inviter?.username || "A teammate",
            acceptUrl: invitationUrl,
          });
        } catch (err) {
          console.error("Org invitation email failed:", err);
        }
      })();

      return NextResponse.json(
         {
            message: "Invitation created successfully.",
            invitation: {
               _id: invitation._id.toString(),
               email: invitation.email,
               role: invitation.role,
               expiresAt: invitation.expiresAt,
               createdAt: invitation.createdAt,
            },
            invitationUrl,
         },
         { status: 201 },
      );
   } catch (error: unknown) {
      return errorResponse(error);
   }
}
