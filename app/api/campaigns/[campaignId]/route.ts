import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import CampaignApplication from "@/models/CampaignApplication";
import Organization from "@/models/Organization";
import { updateCampaignSchema } from "@/lib/validation/campaign";

type Context = { params: Promise<{ campaignId: string }> };

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number(error.statusCode)
    : 500;
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const session = await requireSession();
    const { campaignId } = await context.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await connectToDatabase();
    const campaign = await Campaign.findById(campaignId).lean();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const organization = await Organization.findById(campaign.organizationId)
      .select("_id name logoUrl isSuspended")
      .lean();

    if (!organization || organization.isSuspended) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const isPublicCampaign =
      campaign.isPublic && campaign.status === "active";

    if (!isPublicCampaign) {
      const { role } = await requireOrganizationRole(
        campaign.organizationId.toString(),
        ORGANIZATION_PERMISSIONS.viewAnalytics,
      );

      // Confirm the session has not changed between authentication checks.
      if (!session.userId) {
        return NextResponse.json({ error: "Please log in." }, { status: 401 });
      }
      void role;
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        _id: campaign._id.toString(),
        organizationId: campaign.organizationId.toString(),
        organization,
      },
    });
  } catch (error) {
    const status = statusOf(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load campaign." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireSession();
    const { campaignId } = await context.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = updateCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid campaign update.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.manageCampaigns,
    );

    const update = parsed.data;
    const nextBudget = update.budget ?? campaign.budget;
    const nextReward = update.rewardPerCreator ?? campaign.rewardPerCreator;
    const nextMaxCreators = update.maxCreators ?? campaign.maxCreators;

    const acceptedCount = await CampaignApplication.countDocuments({
      campaignId: campaign._id,
      status: "accepted",
    });

    if (acceptedCount > nextMaxCreators) {
      return NextResponse.json(
        { error: "Maximum creators cannot be lower than the number already accepted." },
        { status: 409 },
      );
    }

    if (acceptedCount * nextReward > nextBudget) {
      return NextResponse.json(
        { error: "Budget cannot be lower than rewards committed to accepted creators." },
        { status: 409 },
      );
    }

    if (nextReward * nextMaxCreators > nextBudget) {
      return NextResponse.json(
        { error: "Budget must cover rewards for all creator slots." },
        { status: 400 },
      );
    }

    if (
      campaign.status === "cancelled" ||
      campaign.status === "completed"
    ) {
      return NextResponse.json(
        { error: "Completed or cancelled campaigns cannot be edited." },
        { status: 409 },
      );
    }

    const nextDeadline = update.applicationDeadline === undefined
      ? campaign.applicationDeadline
      : update.applicationDeadline;

    const nextStart = update.startsAt === undefined
      ? campaign.startsAt
      : update.startsAt;

    const nextEnd = update.endsAt === undefined
      ? campaign.endsAt
      : update.endsAt;

    if (nextDeadline && nextStart && nextDeadline > nextStart) {
      return NextResponse.json(
        { error: "Application deadline must be on or before the start date." },
        { status: 400 },
      );
    }

    if (nextStart && nextEnd && nextEnd <= nextStart) {
      return NextResponse.json(
        { error: "End date must be after the start date." },
        { status: 400 },
      );
    }

    const deadlineWasProvided = Object.prototype.hasOwnProperty.call(
      update,
      "applicationDeadline",
    );

    if (
      nextDeadline &&
      nextDeadline <= new Date() &&
      (
        update.status === "active" ||
        (campaign.status === "active" && deadlineWasProvided)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "An active campaign must have a future application deadline. Update the deadline before activating it.",
        },
        { status: 400 },
      );
    }

    if (update.status && update.status !== campaign.status) {
      const allowedTransitions: Record<string, string[]> = {
        draft: ["active", "cancelled"],
        active: ["paused", "completed", "cancelled"],
        paused: ["active", "completed", "cancelled"],
        completed: [],
        cancelled: [],
      };

      if (!allowedTransitions[campaign.status]?.includes(update.status)) {
        return NextResponse.json(
          {
            error: `Cannot change campaign status from ${campaign.status} to ${update.status}.`,
          },
          { status: 409 },
        );
      }
    }

    Object.assign(campaign, update);
    await campaign.save();

    return NextResponse.json({ campaign: campaign.toObject() });
  } catch (error) {
    const status = statusOf(error);
    if (status === 401 || status === 403 || status === 404) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Access denied." },
        { status },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    console.error("PATCH /api/campaigns/[campaignId]:", error);
    return NextResponse.json(
      { error: "Unable to update campaign." },
      { status: status === 409 ? 409 : 500 },
    );
  }
}
