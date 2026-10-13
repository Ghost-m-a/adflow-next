import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import CampaignApplication from "@/models/CampaignApplication";
import { notifySafe } from "@/services/notification.service";
import { reviewApplicationSchema } from "@/lib/validation/application";

type Context = {
  params: Promise<{
    campaignId: string;
    applicationId: string;
  }>;
};

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number(error.statusCode)
    : 500;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireSession();
    const { campaignId, applicationId } = await context.params;

    if (
      !mongoose.isValidObjectId(campaignId) ||
      !mongoose.isValidObjectId(applicationId)
    ) {
      return NextResponse.json(
        { error: "Campaign or application not found." },
        { status: 404 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const parsed = reviewApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Choose accepted or rejected.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.manageApplications,
    );

    if (campaign.status === "cancelled" || campaign.status === "completed") {
      return NextResponse.json(
        { error: "Applications cannot be reviewed for a completed or cancelled campaign." },
        { status: 409 },
      );
    }

    const application = await CampaignApplication.findOne({
      _id: applicationId,
      campaignId: campaign._id,
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending applications can be reviewed." },
        { status: 409 },
      );
    }

    if (parsed.data.status === "accepted") {
      const acceptedCount = await CampaignApplication.countDocuments({
        campaignId: campaign._id,
        status: "accepted",
      });

      if (acceptedCount >= campaign.maxCreators) {
        return NextResponse.json(
          { error: "This campaign has reached its creator limit." },
          { status: 409 },
        );
      }

      if ((acceptedCount + 1) * campaign.rewardPerCreator > campaign.budget) {
        return NextResponse.json(
          { error: "There is insufficient campaign budget for another creator." },
          { status: 409 },
        );
      }
    }

    const updated = await CampaignApplication.findOneAndUpdate(
      {
        _id: application._id,
        campaignId: campaign._id,
        status: "pending",
      },
      {
        $set: {
          status: parsed.data.status,
          reviewedBy: new mongoose.Types.ObjectId(session.userId),
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return NextResponse.json(
        { error: "This application has already been reviewed." },
        { status: 409 },
      );
    }

    notifySafe({
      userId: updated.creatorId,
      type: "application",
      title:
        updated.status === "accepted"
          ? "Application accepted"
          : "Application not selected",
      message:
        updated.status === "accepted"
          ? `You were accepted into "${campaign.title}". Check your tracking links.`
          : `Your application for "${campaign.title}" was not selected this time.`,
      href:
        updated.status === "accepted"
          ? "/creator/links"
          : "/creator/applications",
    });

    return NextResponse.json({
      application: {
        _id: updated._id.toString(),
        campaignId: updated.campaignId.toString(),
        creatorId: updated.creatorId.toString(),
        status: updated.status,
        reviewedAt: updated.reviewedAt,
      },
    });
  } catch (error) {
    const status = statusOf(error);

    if ([401, 403, 404].includes(status)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Access denied." },
        { status },
      );
    }

    console.error("PATCH application review:", error);

    return NextResponse.json(
      { error: "Unable to review application." },
      { status: 500 },
    );
  }
}
