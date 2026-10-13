import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Campaign from "@/models/Campaign";
import {
  getAccessibleCampaignIds,
  getCampaignMetrics,
  getCreatorLeaderboard,
  getOverview,
  getTimeSeries,
  parseRange,
} from "@/services/analytics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const { range, from } = parseRange(req.nextUrl.searchParams.get("range"));
    const requestedCampaignId = req.nextUrl.searchParams.get("campaignId");

    const { campaignIds: allCampaignIds } = await getAccessibleCampaignIds(
      session.userId,
    );

    // Campaign filter dropdown — always the full list the caller can see.
    const campaignList = await Campaign.find({
      _id: { $in: allCampaignIds },
    })
      .select("_id title status currency budget")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    let campaignIds = allCampaignIds;
    if (
      requestedCampaignId &&
      mongoose.isValidObjectId(requestedCampaignId)
    ) {
      const allowed = allCampaignIds.some(
        (id) => id.toString() === requestedCampaignId,
      );
      if (!allowed) {
        return NextResponse.json(
          { error: "You cannot view analytics for this campaign." },
          { status: 403 },
        );
      }
      campaignIds = [new mongoose.Types.ObjectId(requestedCampaignId)];
    }

    const [overview, campaigns, creators, timeseries] = await Promise.all([
      getOverview(campaignIds, from),
      getCampaignMetrics(campaignIds, from),
      getCreatorLeaderboard(campaignIds, from, 20),
      getTimeSeries(campaignIds, from),
    ]);

    return NextResponse.json({
      range,
      from: from.toISOString(),
      campaignId: requestedCampaignId ?? null,
      overview,
      campaigns,
      creators,
      timeseries,
      campaignList: campaignList.map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        status: c.status,
        currency: c.currency,
        budget: c.budget,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load analytics." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
