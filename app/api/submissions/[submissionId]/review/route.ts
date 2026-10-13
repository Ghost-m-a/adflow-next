import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import ContentSubmission from "@/models/ContentSubmission";
import Campaign from "@/models/Campaign";
import { reviewSubmissionSchema } from "@/lib/validation/submission";
import {
  SubmissionError,
  reviewSubmission,
  reverseApprovedSubmission,
} from "@/services/submission.service";

type Context = { params: Promise<{ submissionId: string }> };

export async function POST(req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { submissionId } = await ctx.params;

    if (!mongoose.isValidObjectId(submissionId)) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const parsed = reviewSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const submission = await ContentSubmission.findById(submissionId).lean();
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const campaign = await Campaign.findById(submission.campaignId)
      .select("organizationId")
      .lean();
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.reviewSubmissions,
    );

    const updated = await reviewSubmission({
      submissionId,
      reviewerId: session.userId,
      decision: parsed.data.decision,
      notes: parsed.data.notes,
      rewardAmountOverride: parsed.data.rewardAmount,
    });

    return NextResponse.json({
      submission: {
        _id: updated._id.toString(),
        status: updated.status,
        reviewedAt: updated.reviewedAt ?? null,
        rewardAmount: updated.rewardAmount,
        rewardCurrency: updated.rewardCurrency,
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
      { error: error instanceof Error ? error.message : "Unable to review." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { submissionId } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const reason = (body as Record<string, unknown>)?.reason;

    if (!mongoose.isValidObjectId(submissionId)) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }

    await connectToDatabase();
    const submission = await ContentSubmission.findById(submissionId).lean();
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const campaign = await Campaign.findById(submission.campaignId)
      .select("organizationId")
      .lean();
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.reviewSubmissions,
    );

    const updated = await reverseApprovedSubmission(
      submissionId,
      session.userId,
      typeof reason === "string" ? reason : "Reversed by advertiser",
    );

    return NextResponse.json({
      submission: {
        _id: updated._id.toString(),
        status: updated.status,
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
      { error: error instanceof Error ? error.message : "Unable to reverse." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
