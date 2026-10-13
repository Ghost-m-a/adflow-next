import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import ContentSubmission from "@/models/ContentSubmission";
import Campaign from "@/models/Campaign";
import Membership from "@/models/Membership";
import { updateSubmissionSchema } from "@/lib/validation/submission";
import { SubmissionError, updateSubmission } from "@/services/submission.service";

type Context = { params: Promise<{ submissionId: string }> };

async function loadSubmissionOrThrow(submissionId: string, userId: string) {
  if (!mongoose.isValidObjectId(submissionId)) {
    throw new SubmissionError("Invalid submission.", 400);
  }
  const submission = await ContentSubmission.findById(submissionId).lean();
  if (!submission) throw new SubmissionError("Submission not found.", 404);

  const isCreator = submission.creatorId.toString() === userId;

  const campaign = await Campaign.findById(submission.campaignId)
    .select("organizationId")
    .lean();
  if (!campaign) throw new SubmissionError("Campaign not found.", 404);

  // Advertiser access check.
  let isAdvertiser = false;
  if (!isCreator) {
    const org = campaign.organizationId.toString();
    const membership = await Membership.findOne({
      organizationId: org,
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("role")
      .lean();
    isAdvertiser = Boolean(membership) || Boolean(await Campaign.exists({
      _id: campaign._id,
      createdBy: new mongoose.Types.ObjectId(userId),
    }));
  }

  if (!isCreator && !isAdvertiser) {
    throw new SubmissionError("You do not have access to this submission.", 403);
  }

  return { submission, isCreator, isAdvertiser };
}

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { submissionId } = await ctx.params;
    await connectToDatabase();

    const { submission } = await loadSubmissionOrThrow(submissionId, session.userId);

    return NextResponse.json({
      submission: {
        ...submission,
        _id: submission._id.toString(),
        campaignId: submission.campaignId.toString(),
        creatorId: submission.creatorId.toString(),
        campaignApplicationId: submission.campaignApplicationId.toString(),
        trackingLinkId: submission.trackingLinkId?.toString() ?? null,
        reviewedBy: submission.reviewedBy?.toString() ?? null,
        ledgerEntryId: submission.ledgerEntryId?.toString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load submission." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { submissionId } = await ctx.params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const parsed = updateSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const updated = await updateSubmission(
      submissionId,
      session.userId,
      parsed.data,
    );

    return NextResponse.json({
      submission: {
        _id: updated._id.toString(),
        status: updated.status,
        title: updated.title,
        description: updated.description,
        contentType: updated.contentType,
        contentUrl: updated.contentUrl,
        thumbnailUrl: updated.thumbnailUrl ?? null,
      },
    });
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update submission." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
