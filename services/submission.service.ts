import mongoose from "mongoose";

import ContentSubmission, {
  type SubmissionContentType,
} from "@/models/ContentSubmission";
import Campaign from "@/models/Campaign";
import CampaignApplication from "@/models/CampaignApplication";
import TrackingLink from "@/models/TrackingLink";
import {
  recordSubmissionReward,
  reverseSubmissionReward,
} from "@/services/ledger.service";
import { notifySafe } from "@/services/notification.service";

export class SubmissionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SubmissionError";
    this.statusCode = statusCode;
  }
}

type CreateInput = {
  creatorId: string;
  campaignId: string;
  title: string;
  description: string;
  contentType: SubmissionContentType;
  contentUrl: string;
  thumbnailUrl?: string;
  trackingLinkId?: string;
};

export async function createSubmission(input: CreateInput) {
  if (!mongoose.isValidObjectId(input.campaignId)) {
    throw new SubmissionError("Invalid campaign.", 400);
  }

  const campaign = await Campaign.findById(input.campaignId).lean();
  if (!campaign) throw new SubmissionError("Campaign not found.", 404);

  // Creator must be accepted into this campaign.
  const application = await CampaignApplication.findOne({
    campaignId: campaign._id,
    creatorId: new mongoose.Types.ObjectId(input.creatorId),
    status: "accepted",
  }).lean();

  if (!application) {
    throw new SubmissionError(
      "You must be an accepted creator on this campaign to submit content.",
      403,
    );
  }

  // Optional: attach a tracking link if it belongs to the same campaign.
  let trackingLinkId: mongoose.Types.ObjectId | undefined;
  if (input.trackingLinkId && mongoose.isValidObjectId(input.trackingLinkId)) {
    const link = await TrackingLink.findOne({
      _id: input.trackingLinkId,
      campaignId: campaign._id,
      creatorId: new mongoose.Types.ObjectId(input.creatorId),
    })
      .select("_id")
      .lean();
    if (link) trackingLinkId = link._id;
  }

  return ContentSubmission.create({
    campaignId: campaign._id,
    creatorId: new mongoose.Types.ObjectId(input.creatorId),
    campaignApplicationId: application._id,
    trackingLinkId,
    title: input.title,
    description: input.description,
    contentType: input.contentType,
    contentUrl: input.contentUrl,
    thumbnailUrl: input.thumbnailUrl,
    // Snapshot the reward at creation time so later campaign edits
    // don't silently change what this submission is worth.
    rewardAmount: campaign.rewardPerCreator,
    rewardCurrency: campaign.currency,
    status: "draft",
  });
}

export async function updateSubmission(
  submissionId: string,
  creatorId: string,
  update: Partial<{
    title: string;
    description: string;
    contentType: SubmissionContentType;
    contentUrl: string;
    thumbnailUrl: string;
  }>,
) {
  const submission = await ContentSubmission.findById(submissionId);
  if (!submission) throw new SubmissionError("Submission not found.", 404);

  if (submission.creatorId.toString() !== creatorId) {
    throw new SubmissionError("You can only edit your own submissions.", 403);
  }

  if (!["draft", "changes_requested"].includes(submission.status)) {
    throw new SubmissionError(
      `You cannot edit a ${submission.status} submission.`,
      409,
    );
  }

  Object.assign(submission, update);
  await submission.save();
  return submission;
}

/** Move draft or changes_requested → submitted. */
export async function submitForReview(submissionId: string, creatorId: string) {
  const submission = await ContentSubmission.findById(submissionId);
  if (!submission) throw new SubmissionError("Submission not found.", 404);

  if (submission.creatorId.toString() !== creatorId) {
    throw new SubmissionError("You can only submit your own content.", 403);
  }

  if (!["draft", "changes_requested"].includes(submission.status)) {
    throw new SubmissionError(
      `This submission is already ${submission.status}.`,
      409,
    );
  }

  submission.status = "submitted";
  submission.submittedAt = new Date();
  submission.reviewNotes = undefined;
  await submission.save();

  // Notify the campaign owner.
  const campaign = await Campaign.findById(submission.campaignId)
    .select("createdBy title")
    .lean();
  if (campaign?.createdBy) {
    notifySafe({
      userId: campaign.createdBy,
      type: "application",
      title: "New content submission",
      message: `"${submission.title}" was submitted for review on "${campaign.title}".`,
      href: "/advertiser/submissions",
    });
  }

  return submission;
}

type ReviewInput = {
  submissionId: string;
  reviewerId: string;
  decision: "approve" | "reject" | "request_changes";
  notes?: string;
  rewardAmountOverride?: number;
};

export async function reviewSubmission(input: ReviewInput) {
  const submission = await ContentSubmission.findById(input.submissionId);
  if (!submission) throw new SubmissionError("Submission not found.", 404);

  if (submission.status !== "submitted") {
    throw new SubmissionError(
      `Only submitted content can be reviewed (current: ${submission.status}).`,
      409,
    );
  }

  const campaign = await Campaign.findById(submission.campaignId).lean();
  if (!campaign) throw new SubmissionError("Campaign not found.", 404);

  submission.reviewedBy = new mongoose.Types.ObjectId(input.reviewerId);
  submission.reviewedAt = new Date();
  submission.reviewNotes = input.notes;

  if (input.decision === "request_changes") {
    submission.status = "changes_requested";
    await submission.save();
    notifySafe({
      userId: submission.creatorId,
      type: "application",
      title: "Changes requested",
      message: input.notes
        ? `Your submission "${submission.title}" needs changes: ${input.notes}`
        : `Your submission "${submission.title}" needs changes.`,
      href: "/creator/submissions",
    });
    return submission;
  }

  if (input.decision === "reject") {
    submission.status = "rejected";
    await submission.save();
    notifySafe({
      userId: submission.creatorId,
      type: "application",
      title: "Submission rejected",
      message: input.notes
        ? `"${submission.title}": ${input.notes}`
        : `Your submission "${submission.title}" was rejected.`,
      href: "/creator/submissions",
    });
    return submission;
  }

  // Approve — create the ledger credit exactly once.
  if (submission.ledgerEntryId) {
    throw new SubmissionError("This submission has already been credited.", 409);
  }

  const finalAmount =
    typeof input.rewardAmountOverride === "number" &&
    input.rewardAmountOverride >= 0
      ? Number(input.rewardAmountOverride.toFixed(2))
      : submission.rewardAmount;

  const credit = await recordSubmissionReward({
    submissionId: submission._id,
    organizationId: campaign.organizationId,
    creatorId: submission.creatorId,
    campaignId: submission.campaignId,
    amount: finalAmount,
    currency: submission.rewardCurrency,
  });

  submission.rewardAmount = finalAmount;
  submission.status = "approved";
  submission.approvedAt = new Date();
  submission.ledgerEntryId = credit._id;
  await submission.save();

  notifySafe({
    userId: submission.creatorId,
    type: "payment",
    title: "Submission approved",
    message: `${submission.rewardCurrency} ${finalAmount.toFixed(2)} was added to your available balance.`,
    href: "/creator/earnings",
  });

  return submission;
}

/** Reject an approved submission — reverses the credit and voids the debit. */
export async function reverseApprovedSubmission(
  submissionId: string,
  reviewerId: string,
  reason: string,
) {
  const submission = await ContentSubmission.findById(submissionId);
  if (!submission) throw new SubmissionError("Submission not found.", 404);

  if (submission.status !== "approved" || !submission.ledgerEntryId) {
    throw new SubmissionError(
      "Only approved submissions with a credited ledger entry can be reversed.",
      409,
    );
  }

  await reverseSubmissionReward(submission.ledgerEntryId);

  submission.status = "rejected";
  submission.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
  submission.reviewedAt = new Date();
  submission.reviewNotes = reason;
  await submission.save();

  return submission;
}
