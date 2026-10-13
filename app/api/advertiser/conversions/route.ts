import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Membership from "@/models/Membership";
import Organization from "@/models/Organization";
import Conversion from "@/models/Conversion";
import Campaign from "@/models/Campaign";
import CreatorProfile from "@/models/CreatorProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const campaignId = url.searchParams.get("campaignId");

    // Determine which organizations the caller can see.
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

    if (orgIds.length === 0) {
      return NextResponse.json({ conversions: [] });
    }

    const filter: Record<string, unknown> = {
      advertiserOrganizationId: { $in: orgIds },
    };
    if (status && status !== "all") filter.status = status;
    if (campaignId && mongoose.isValidObjectId(campaignId)) {
      filter.campaignId = new mongoose.Types.ObjectId(campaignId);
    }

    const conversions = await Conversion.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const campaignIds = [...new Set(conversions.map((c) => c.campaignId.toString()))];
    const creatorIds = [
      ...new Set(
        conversions
          .map((c) => c.creatorId?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [campaigns, profiles] = await Promise.all([
      Campaign.find({ _id: { $in: campaignIds } }).select("_id title slug").lean(),
      CreatorProfile.find({ userId: { $in: creatorIds } })
        .select("_id userId username displayName avatarUrl")
        .lean(),
    ]);

    const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return NextResponse.json({
      conversions: conversions.map((c) => ({
        _id: c._id.toString(),
        campaignId: c.campaignId.toString(),
        campaign: campaignMap.get(c.campaignId.toString()) ?? null,
        creatorProfile: c.creatorId
          ? profileMap.get(c.creatorId.toString()) ?? null
          : null,
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        source: c.source,
        externalId: c.externalId,
        createdAt: c.createdAt,
        approvedAt: c.approvedAt ?? null,
        rejectedAt: c.rejectedAt ?? null,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load conversions." },
      { status },
    );
  }
}
