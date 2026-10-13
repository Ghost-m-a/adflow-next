import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import ContentSubmission from "@/models/ContentSubmission";
import { createSubmissionSchema } from "@/lib/validation/submission";
import { createSubmission, SubmissionError } from "@/services/submission.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      ORGANIZATION_PERMISSIONS.reviewSubmissions,
    );

    const status = new URL(_req.url).searchParams.get("status");
    const filter: Record<string, unknown> = { campaignId: campaign._id };
    if (status && status !== "all") filter.status = status;

    const submissions = await ContentSubmission.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({ path: "creatorId", select: "_id name username email avatarUrl" })
      .lean();

    return NextResponse.json({
      submissions: submissions.map((s) => {
        const creator = s.creatorId as unknown as {
          _id?: mongoose.Types.ObjectId;
          name?: string;
          username?: string;
          email?: string;
          avatarUrl?: string;
        } | null;

        return {
          _id: s._id.toString(),
          campaignId: s.campaignId.toString(),
          creator: creator
            ? {
                userId: creator._id?.toString() ?? "",
                name: creator.name ?? "",
                username: creator.username ?? "",
                email: creator.email ?? "",
                avatarUrl: creator.avatarUrl ?? "",
              }
            : null,
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
        };
      }),
      campaignOwnerId: session.userId,
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

export async function POST(req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { campaignId } = await ctx.params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const parsed = createSubmissionSchema.safeParse({
      ...body,
      campaignId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const submission = await createSubmission({
      creatorId: session.userId,
      campaignId: parsed.data.campaignId,
      title: parsed.data.title,
      description: parsed.data.description,
      contentType: parsed.data.contentType,
      contentUrl: parsed.data.contentUrl,
      thumbnailUrl: parsed.data.thumbnailUrl,
      trackingLinkId: parsed.data.trackingLinkId,
    });

    return NextResponse.json(
      {
        submission: {
          _id: submission._id.toString(),
          status: submission.status,
          rewardAmount: submission.rewardAmount,
          rewardCurrency: submission.rewardCurrency,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }
    console.error("POST submission:", error);
    return NextResponse.json({ error: "Unable to create submission." }, { status: 500 });
  }
}
