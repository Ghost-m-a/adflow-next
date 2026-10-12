import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import OrganizationInvitation from "@/models/OrganizationInvitation";
import { connectToDatabase } from "@/lib/db/mongodb";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    invitationId: string;
  }>;
};

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { organizationId, invitationId } = await params;

    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    if (!mongoose.isValidObjectId(invitationId)) {
      return NextResponse.json(
        { error: "Invalid invitation ID." },
        { status: 400 }
      );
    }

    const invitation = await OrganizationInvitation.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(invitationId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        acceptedAt: null,
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } },
      { new: true }
    )
      .select("_id email revokedAt")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { error: "Pending invitation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Invitation revoked.",
      invitation: {
        _id: invitation._id.toString(),
        email: invitation.email,
        revokedAt: invitation.revokedAt,
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error
        ? Number(error.statusCode)
        : 500;

    if ([401, 403, 404].includes(status)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request denied." },
        { status }
      );
    }

    console.error("DELETE organization invitation:", error);

    return NextResponse.json(
      { error: "Unable to revoke invitation." },
      { status: 500 }
    );
  }
}
