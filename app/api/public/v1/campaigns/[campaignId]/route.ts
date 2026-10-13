import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Campaign from "@/models/Campaign";
import { requireApiKey } from "@/lib/api-keys/middleware";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ campaignId: string }> },
) {
  const auth = await requireApiKey(req, "read:campaigns");
  if (auth instanceof NextResponse) return auth;

  const { campaignId } = await ctx.params;
  if (!mongoose.isValidObjectId(campaignId)) {
    return NextResponse.json({ error: "Invalid campaignId." }, { status: 400 });
  }

  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizationId: auth.organizationId,
  }).lean();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: campaign._id.toString(),
      title: campaign.title,
      slug: campaign.slug,
      description: campaign.description,
      brief: campaign.brief ?? "",
      status: campaign.status,
      platform: campaign.platform,
      supportedPlatforms: campaign.supportedPlatforms ?? [],
      goal: campaign.goal,
      budget: campaign.budget,
      currency: campaign.currency,
      rewardPerCreator: campaign.rewardPerCreator,
      rewardPerThousand: campaign.rewardPerThousand ?? null,
      maxCreators: campaign.maxCreators,
      category: campaign.category ?? "",
      hashtags: campaign.hashtags ?? [],
      requirements: campaign.requirements ?? [],
      applicationDeadline: campaign.applicationDeadline ?? null,
      startsAt: campaign.startsAt ?? null,
      endsAt: campaign.endsAt ?? null,
      createdAt: campaign.createdAt,
    },
  });
}
