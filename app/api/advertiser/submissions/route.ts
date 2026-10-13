import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Membership from "@/models/Membership";
import Organization from "@/models/Organization";
import Campaign from "@/models/Campaign";
import ContentSubmission from "@/models/ContentSubmission";
import CreatorProfile from "@/models/CreatorProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "submitted";
    const campaignId = url.searchParams.get("campaignId");

    // Organizations the caller can access.
    const userId = new mongoose.Types.ObjectId(session.userId);
    const [owned, memberships] = await Promise.all([
      Organization.find({ ownerId: userId }).select("_id").lean(),
      Membership.find({ userId }).select("organizationId").lean(),
    ]);
    const orgIds = [
      ...new Set([
        ...owned.map((o) => o._id.toString()),
        ...memberships.map((m) => m.organizationId.toString()),
      ]),
    ];

    const campaigns = await Campaign.find({
      organizationId: { $in: orgIds },
      ...(campaignId && mongoose.isValidObjectId(campaignId)
        ? { _id: new mongoose.Types.ObjectId(campaignId) }
        : {}),
    })
      .select("_id title slug currency")
      .lean();

    const campaignIds = campaigns.map((c) => c._id);
    const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));

    const filter: Record<string, unknown> = { campaignId: { $in: campaignIds } };
    if (status !== "all") filter.status = status;

    const submissions = await ContentSubmission.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const creatorIds = [...new Set(submissions.map((s) => s.creatorId.toString()))];
    const profiles = await CreatorProfile.find({ userId: { $in: creatorIds } })
      .select("_id userId username displayName avatarUrl")
      .lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        _id: s._id.toString(),
        campaign: campaignMap.get(s.campaignId.toString()) ?? null,
        creator: profileMap.get(s.creatorId.toString()) ?? null,
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
        createdAt: s.createdAt,
      })),
      campaigns: campaigns.map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        slug: c.slug,
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
