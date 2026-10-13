import { NextRequest, NextResponse } from "next/server";
import CampaignModel from "@/models/Campaign";
import { requireApiKey } from "@/lib/api-keys/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, "read:campaigns");
  if (auth instanceof NextResponse) return auth;

  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 50),
    200,
  );
  const status = req.nextUrl.searchParams.get("status");

  const filter: Record<string, unknown> = {
    organizationId: auth.organizationId,
  };
  if (status && status !== "all") filter.status = status;

  const campaigns = await CampaignModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "title slug status platform goal budget currency rewardPerCreator maxCreators createdAt applicationDeadline",
    )
    .lean();

  return NextResponse.json({
    data: campaigns.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
      status: c.status,
      platform: c.platform,
      goal: c.goal,
      budget: c.budget,
      currency: c.currency,
      rewardPerCreator: c.rewardPerCreator,
      maxCreators: c.maxCreators,
      applicationDeadline: c.applicationDeadline ?? null,
      createdAt: c.createdAt,
    })),
    count: campaigns.length,
  });
}
