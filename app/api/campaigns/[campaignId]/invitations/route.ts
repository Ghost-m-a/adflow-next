import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import CampaignInvitation from "@/models/CampaignInvitation";
import CreatorProfile from "@/models/CreatorProfile";
import {
  InvitationError,
  createInvitation,
} from "@/services/campaign-invitation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    await requireSession();
    const { campaignId } = await ctx.params;
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

    const invitations = await CampaignInvitation.find({ campaignId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const creatorIds = invitations.map((i) => i.creatorId);
    const profiles = await CreatorProfile.find({ userId: { $in: creatorIds } })
      .select("userId username displayName avatarUrl")
      .lean();
    const profileMap = new Map(
      profiles.map((p) => [p.userId.toString(), p]),
    );

    return NextResponse.json({
      invitations: invitations.map((i) => ({
        _id: i._id.toString(),
        creatorId: i.creatorId.toString(),
        creatorProfile: profileMap.get(i.creatorId.toString()) ?? null,
        message: i.message ?? "",
        status: i.status,
        expiresAt: i.expiresAt,
        respondedAt: i.respondedAt ?? null,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load invitations." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function POST(req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { campaignId } = await ctx.params;
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { creatorId, message } = body as {
      creatorId?: unknown;
      message?: unknown;
    };

    if (typeof creatorId !== "string" || !mongoose.isValidObjectId(creatorId)) {
      return NextResponse.json({ error: "creatorId required." }, { status: 400 });
    }

    const invitation = await createInvitation({
      campaignId,
      organizationId: campaign.organizationId.toString(),
      invitedBy: session.userId,
      creatorId,
      message: typeof message === "string" ? message.slice(0, 1000) : undefined,
      appOrigin: req.nextUrl.origin,
    });

    return NextResponse.json(
      {
        invitation: {
          _id: invitation._id.toString(),
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if ([400, 401, 403, 404, 409].includes(status)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request denied." },
        { status },
      );
    }
    console.error("POST invitation:", error);
    return NextResponse.json({ error: "Unable to send invitation." }, { status: 500 });
  }
}
