import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import {
  InvitationError,
  revokeInvitation,
} from "@/services/campaign-invitation.service";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ campaignId: string; invitationId: string }> },
) {
  try {
    await requireSession();
    const { campaignId, invitationId } = await ctx.params;
    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
    }

    await connectToDatabase();
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.manageApplications,
    );

    const invitation = await revokeInvitation(
      invitationId,
      campaign.organizationId.toString(),
    );

    return NextResponse.json({
      invitation: {
        _id: invitation._id.toString(),
        status: invitation.status,
      },
    });
  } catch (error) {
    if (error instanceof InvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to revoke." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
