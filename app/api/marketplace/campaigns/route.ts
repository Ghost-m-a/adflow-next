import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Campaign, {
  CAMPAIGN_GOALS,
  CAMPAIGN_PLATFORMS,
} from "@/models/Campaign";
import Organization from "@/models/Organization";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const params = request.nextUrl.searchParams;
    const search = params.get("q")?.trim().slice(0, 100);
    const platform = params.get("platform");
    const goal = params.get("goal");
    const niche = params.get("niche")?.trim().slice(0, 80);

    if (platform && !CAMPAIGN_PLATFORMS.includes(platform as never)) {
      return NextResponse.json({ error: "Invalid platform filter." }, { status: 400 });
    }
    if (goal && !CAMPAIGN_GOALS.includes(goal as never)) {
      return NextResponse.json({ error: "Invalid goal filter." }, { status: 400 });
    }

    const organizationFilter = await Organization.find({
      isSuspended: false,
    }).select("_id").lean();

    const filter: Record<string, unknown> = {
      status: "active",
      isPublic: true,
      organizationId: { $in: organizationFilter.map((org) => org._id) },
      $and: [
        {
          $or: [
            { applicationDeadline: { $exists: false } },
            { applicationDeadline: null },
            { applicationDeadline: { $gt: new Date() } },
          ],
        },
      ],
    };

    if (platform) filter.platform = platform;
    if (goal) filter.goal = goal;
    if (niche) filter.targetNiches = { $in: [niche.toLowerCase()] };
    if (search) {
      (filter.$and as Record<string, unknown>[]).push({
        $or: [
          { title: { $regex: escapeRegex(search), $options: "i" } },
          { description: { $regex: escapeRegex(search), $options: "i" } },
        ],
      });
    }

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .select(
        "title slug description platform goal budget currency rewardPerCreator maxCreators targetNiches targetCountries requirements applicationDeadline startsAt endsAt createdAt organizationId",
      )
      .lean();

    const orgIds = [...new Set(
      campaigns.map((campaign) => campaign.organizationId.toString()),
    )];

    const organizations = orgIds.length
      ? await Organization.find({ _id: { $in: orgIds } })
          .select("_id name logoUrl isVerified")
          .lean()
      : [];

    const organizationMap = new Map(
      organizations.map((org) => [org._id.toString(), org]),
    );

    return NextResponse.json({
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        _id: campaign._id.toString(),
        organizationId: campaign.organizationId.toString(),
        organization: organizationMap.get(
          campaign.organizationId.toString(),
        ) ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/marketplace/campaigns:", error);
    return NextResponse.json(
      { error: "Unable to load marketplace campaigns." },
      { status: 500 },
    );
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
