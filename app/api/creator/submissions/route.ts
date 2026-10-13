import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import ContentSubmission from "@/models/ContentSubmission";
import Campaign from "@/models/Campaign";
import CampaignApplication from "@/models/CampaignApplication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const submissions = await ContentSubmission.find({
      creatorId: session.userId,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const campaignIds = [...new Set(submissions.map((s) => s.campaignId.toString()))];
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } })
      .select("_id title slug currency status")
      .lean();
    const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));

    // Also surface the accepted campaigns that can still receive submissions.
    const accepted = await CampaignApplication.find({
      creatorId: new mongoose.Types.ObjectId(session.userId),
      status: "accepted",
    })
      .select("campaignId")
      .lean();

    const eligibleIds = [...new Set(accepted.map((a) => a.campaignId.toString()))];
    const eligible = await Campaign.find({
      _id: { $in: eligibleIds },
      status: { $in: ["active", "paused"] },
    })
      .select("_id title slug currency rewardPerCreator status")
      .lean();

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        _id: s._id.toString(),
        campaignId: s.campaignId.toString(),
        campaign: campaignMap.get(s.campaignId.toString()) ?? null,
        title: s.title,
        description: s.description,
        contentType: s.contentType,
        contentUrl: s.contentUrl,
        thumbnailUrl: s.thumbnailUrl ?? null,
        rewardAmount: s.rewardAmount,
        rewardCurrency: s.rewardCurrency,
        status: s.status,
        submittedAt: s.submittedAt ?? null,
        reviewedAt: s.reviewedAt ?? null,
        reviewNotes: s.reviewNotes ?? null,
        approvedAt: s.approvedAt ?? null,
        createdAt: s.createdAt,
      })),
      eligibleCampaigns: eligible.map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        currency: c.currency,
        rewardPerCreator: c.rewardPerCreator,
        status: c.status,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load submissions." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
