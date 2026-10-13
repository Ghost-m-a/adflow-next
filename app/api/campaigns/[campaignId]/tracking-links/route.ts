import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import CampaignApplication from "@/models/CampaignApplication";
import CreatorProfile from "@/models/CreatorProfile";
import TrackingLink from "@/models/TrackingLink";
import {
  generateTrackingToken,
  hashTrackingToken,
} from "@/lib/tracking/token";

export const runtime = "nodejs";

type Context = { params: Promise<{ campaignId: string }> };

export async function GET(_req: NextRequest, ctx: Context) {
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
      ORGANIZATION_PERMISSIONS.manageCampaigns,
    );

    const links = await TrackingLink.find({ campaignId })
      .select("+tokenPlain")
      .sort({ createdAt: -1 })
      .lean();

    const creatorIds = links.map((l) => l.creatorId.toString());
    const profiles = await CreatorProfile.find({
      userId: { $in: creatorIds },
    })
      .select("_id userId username displayName avatarUrl")
      .lean();

    const profileMap = new Map(
      profiles.map((p) => [p.userId.toString(), p]),
    );

    return NextResponse.json({
      links: links.map((link) => ({
        _id: link._id.toString(),
        creatorId: link.creatorId.toString(),
        creatorProfile: profileMap.get(link.creatorId.toString()) ?? null,
        token: link.tokenPlain,
        destinationUrl: link.destinationUrl,
        clicks: link.clicks,
        conversions: link.conversions,
        isActive: link.isActive,
        createdAt: link.createdAt,
      })),
      userId: session.userId,
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

export async function POST(request: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { campaignId } = await ctx.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const creatorId = (body as Record<string, unknown>).creatorId;
    const destinationUrl = (body as Record<string, unknown>).destinationUrl;

    if (typeof creatorId !== "string" || !mongoose.isValidObjectId(creatorId)) {
      return NextResponse.json({ error: "creatorId is required." }, { status: 400 });
    }
    if (
      typeof destinationUrl !== "string" ||
      !/^https?:\/\/\S+$/i.test(destinationUrl)
    ) {
      return NextResponse.json(
        { error: "A valid HTTP/HTTPS destinationUrl is required." },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.manageCampaigns,
    );

    // The creator must have been accepted into this campaign.
    const accepted = await CampaignApplication.findOne({
      campaignId: campaign._id,
      creatorId: new mongoose.Types.ObjectId(creatorId),
      status: "accepted",
    }).lean();

    if (!accepted) {
      return NextResponse.json(
        { error: "Only accepted creators can receive tracking links." },
        { status: 409 },
      );
    }

    const profile = await CreatorProfile.findOne({
      userId: new mongoose.Types.ObjectId(creatorId),
    })
      .select("_id")
      .lean();

    if (!profile) {
      return NextResponse.json(
        { error: "Creator profile not found." },
        { status: 404 },
      );
    }

    // One link per creator per campaign. Replace the old one if it exists.
    const token = generateTrackingToken();

    const link = await TrackingLink.findOneAndUpdate(
      { campaignId: campaign._id, creatorId: new mongoose.Types.ObjectId(creatorId) },
      {
        $set: {
          tokenHash: hashTrackingToken(token),
          tokenPlain: token,
          destinationUrl,
          creatorProfileId: profile._id,
          isActive: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    void session;

    return NextResponse.json(
      {
        link: {
          _id: link!._id.toString(),
          campaignId: link!.campaignId.toString(),
          creatorId: link!.creatorId.toString(),
          token,
          destinationUrl: link!.destinationUrl,
          isActive: link!.isActive,
          createdAt: link!.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
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
    console.error("POST tracking link:", error);
    return NextResponse.json({ error: "Unable to create link." }, { status: 500 });
  }
}
