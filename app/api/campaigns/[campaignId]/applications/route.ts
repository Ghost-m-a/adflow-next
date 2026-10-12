import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import Organization from "@/models/Organization";
import CampaignApplication from "@/models/CampaignApplication";
import CreatorProfile from "@/models/CreatorProfile";
import { createApplicationSchema } from "@/lib/validation/application";

type Context = { params: Promise<{ campaignId: string }> };

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number(error.statusCode)
    : 500;
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireSession();
    const { campaignId } = await context.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid application.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const campaign = await Campaign.findOne({
      _id: campaignId,
      status: "active",
      isPublic: true,
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "This campaign is not accepting applications." },
        { status: 404 },
      );
    }

    const organization = await Organization.findById(campaign.organizationId)
      .select("isSuspended")
      .lean();

    if (!organization || organization.isSuspended) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    if (
      campaign.applicationDeadline &&
      campaign.applicationDeadline <= new Date()
    ) {
      return NextResponse.json(
        { error: "The application deadline has passed." },
        { status: 409 },
      );
    }

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

    const creatorProfile = await CreatorProfile.findOne({
      userId: new mongoose.Types.ObjectId(session.userId),
    }).select("_id");

    if (!creatorProfile) {
      return NextResponse.json(
        { error: "Create a creator profile before applying to campaigns." },
        { status: 409 },
      );
    }

    const application = await CampaignApplication.create({
      campaignId: campaign._id,
      creatorId: new mongoose.Types.ObjectId(session.userId),
      creatorProfileId: creatorProfile._id,
      message: parsed.data.message,
      proposedRate: parsed.data.proposedRate,
    });

    return NextResponse.json(
      { application: application.toObject() },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "You have already applied to this campaign." },
        { status: 409 },
      );
    }

    const status = statusOf(error);
    if (status === 401) {
      return NextResponse.json({ error: "Please log in to apply." }, { status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    console.error("POST campaign application:", error);
    return NextResponse.json(
      { error: "Unable to submit application." },
      { status: 500 },
    );
  }
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    await requireSession();
    const { campaignId } = await context.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await connectToDatabase();
    const campaign = await Campaign.findById(campaignId).select("organizationId");

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.manageApplications,
    );

    const applications = await CampaignApplication.find({ campaignId })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({
        path: "creatorProfileId",
        select: "username displayName bio avatarUrl country niches socialLinks",
      })
      .lean();

    return NextResponse.json({
      applications: applications.map((application) => ({
        ...application,
        _id: application._id.toString(),
        campaignId: application.campaignId.toString(),
        creatorId: application.creatorId.toString(),
      })),
    });
  } catch (error) {
    const status = statusOf(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load applications." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
