import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import TrackingLink from "@/models/TrackingLink";
import Campaign from "@/models/Campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const links = await TrackingLink.find({ creatorId: session.userId })
      .select("+tokenPlain")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const campaignIds = [...new Set(links.map((l) => l.campaignId.toString()))];
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } })
      .select("_id title slug status currency rewardPerCreator")
      .lean();

    const campaignMap = new Map(
      campaigns.map((c) => [c._id.toString(), c]),
    );

    const origin = new URL(request.url).origin;

    return NextResponse.json({
      links: links.map((link) => {
        const campaign = campaignMap.get(link.campaignId.toString());
        return {
          _id: link._id.toString(),
          campaignId: link.campaignId.toString(),
          campaign: campaign
            ? {
                title: campaign.title,
                slug: campaign.slug,
                status: campaign.status,
                rewardPerCreator: campaign.rewardPerCreator,
                currency: campaign.currency,
              }
            : null,
          isActive: link.isActive,
          clicks: link.clicks,
          conversions: link.conversions,
          createdAt: link.createdAt,
          token: link.tokenPlain,
          fullUrl: `${origin}/r/${link.tokenPlain}`,
          origin,
        };
      }),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load links." },
      { status },
    );
  }
}
