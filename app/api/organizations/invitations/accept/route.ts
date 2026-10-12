import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { requireSession } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/db/mongodb";
import Organization from "@/models/Organization";
import OrganizationInvitation from "@/models/OrganizationInvitation";
import Membership from "@/models/Membership";

class InvitationError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "InvitationError";
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Please provide valid JSON." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid invitation details." },
        { status: 400 }
      );
    }

    const token = (body as Record<string, unknown>).token;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return NextResponse.json(
        { error: "Invalid invitation token." },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const mongoSession = await mongoose.startSession();

    let acceptedOrganization:
      | { _id: string; name: string; role: string }
      | undefined;

    try {
      await mongoSession.withTransaction(async () => {
        const now = new Date();

        const invitation = await OrganizationInvitation.findOne({
          tokenHash,
        })
          .session(mongoSession)
          .lean();

        if (!invitation) {
          throw new InvitationError(
            "Invitation is invalid or no longer available.",
            404
          );
        }

        if (
          invitation.acceptedAt ||
          invitation.revokedAt ||
          invitation.expiresAt <= now
        ) {
          throw new InvitationError(
            "This invitation has expired, been revoked, or already been accepted.",
            410
          );
        }

        if (invitation.email !== session.email.toLowerCase()) {
          throw new InvitationError(
            "Sign in with the email address that received this invitation.",
            403
          );
        }

        const organization = await Organization.findById(
          invitation.organizationId
        )
          .select("_id name isSuspended")
          .session(mongoSession)
          .lean();

        if (!organization) {
          throw new InvitationError(
            "The organization no longer exists.",
            404
          );
        }

        if (organization.isSuspended) {
          throw new InvitationError(
            "This organization is suspended.",
            403
          );
        }

        const existingMembership = await Membership.findOne({
          organizationId: invitation.organizationId,
          userId: new mongoose.Types.ObjectId(session.userId),
        })
          .select("_id")
          .session(mongoSession)
          .lean();

        if (existingMembership) {
          throw new InvitationError(
            "You are already a member of this organization.",
            409
          );
        }

        // Atomically claim the invitation inside the transaction.
        const claimedInvitation =
          await OrganizationInvitation.findOneAndUpdate(
            {
              _id: invitation._id,
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { $gt: now },
            },
            { $set: { acceptedAt: now } },
            {
              new: true,
              session: mongoSession,
            }
          );

        if (!claimedInvitation) {
          throw new InvitationError(
            "This invitation is no longer available.",
            409
          );
        }

        await Membership.create(
          [
            {
              organizationId: invitation.organizationId,
              userId: new mongoose.Types.ObjectId(session.userId),
              role: invitation.role,
              invitedBy: invitation.invitedBy,
              joinedAt: now,
            },
          ],
          { session: mongoSession }
        );

        acceptedOrganization = {
          _id: organization._id.toString(),
          name: organization.name,
          role: invitation.role,
        };
      });
    } finally {
      await mongoSession.endSession();
    }

    if (!acceptedOrganization) {
      throw new Error("Invitation acceptance did not complete.");
    }

    return NextResponse.json({
      message: "Invitation accepted successfully.",
      organization: acceptedOrganization,
    });
  } catch (error) {
    if (error instanceof InvitationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    const status =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error
        ? Number(error.statusCode)
        : 500;

    if (status === 401) {
      return NextResponse.json(
        { error: "Please log in before accepting an invitation." },
        { status: 401 }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "You may already be a member of this organization." },
        { status: 409 }
      );
    }

    console.error("POST accept organization invitation:", error);

    return NextResponse.json(
      {
        error:
          "Unable to accept the invitation. Check that your MongoDB deployment supports transactions.",
      },
      { status: 500 }
    );
  }
}
