import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import CampaignInvitation from "@/models/CampaignInvitation";
import Campaign from "@/models/Campaign";
import Organization from "@/models/Organization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const invitations = await CampaignInvitation.find({
      creatorId: session.userId,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const campaignIds = [...new Set(invitations.map((i) => i.campaignId.toString()))];
    const orgIds = [
      ...new Set(invitations.map((i) => i.advertiserOrganizationId.toString())),
    ];

    const [campaigns, orgs] = await Promise.all([
      Campaign.find({ _id: { $in: campaignIds } })
        .select("_id title slug currency status rewardPerCreator category coverImageUrl")
        .lean(),
      Organization.find({ _id: { $in: orgIds } }).select("_id name logoUrl").lean(),
    ]);

    const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));
    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o]));

    return NextResponse.json({
      invitations: invitations.map((i) => ({
        _id: i._id.toString(),
        campaign: campaignMap.get(i.campaignId.toString()) ?? null,
        organization: orgMap.get(i.advertiserOrganizationId.toString()) ?? null,
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
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
