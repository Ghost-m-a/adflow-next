import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import Membership from "@/models/Membership";
import Organization from "@/models/Organization";
import { createCampaignSchema } from "@/lib/validation/campaign";

function errorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error
  ) {
    return Number(error.statusCode);
  }
  return 500;
}

function campaignSlug(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "campaign";

  return `${base}-${Date.now().toString(36)}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const userId = new mongoose.Types.ObjectId(session.userId);
    const [owned, memberships] = await Promise.all([
      Organization.find({ ownerId: userId, isSuspended: false })
        .select("_id")
        .lean(),
      Membership.find({ userId }).select("organizationId").lean(),
    ]);

    const organizationIds = [
      ...new Set([
        ...owned.map((org) => org._id.toString()),
        ...memberships.map((membership) =>
          membership.organizationId.toString(),
        ),
      ]),
    ];

    const requestedOrg = request.nextUrl.searchParams.get("organizationId");
    if (
      requestedOrg &&
      !mongoose.isValidObjectId(requestedOrg)
    ) {
      return NextResponse.json(
        { error: "Invalid organization ID." },
        { status: 400 },
      );
    }

    if (requestedOrg && !organizationIds.includes(requestedOrg)) {
      return NextResponse.json(
        { error: "You cannot view this organization's campaigns." },
        { status: 403 },
      );
    }

    const filter: Record<string, unknown> = {
      organizationId: {
        $in: requestedOrg ? [requestedOrg] : organizationIds,
      },
    };

    const campaigns = organizationIds.length
      ? await Campaign.find(filter)
          .sort({ createdAt: -1 })
          .limit(200)
          .lean()
      : [];

    const orgIds = [...new Set(
      campaigns.map((campaign) => campaign.organizationId.toString()),
    )];

    const organizations = orgIds.length
      ? await Organization.find({ _id: { $in: orgIds } })
          .select("_id name logoUrl")
          .lean()
      : [];

    const organizationMap = new Map(
      organizations.map((org) => [org._id.toString(), org]),
    );

    return NextResponse.json({
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        _id: campaign._id.toString(),
        organizationId: campaign.organizationId.toString(),
        organization: organizationMap.get(
          campaign.organizationId.toString(),
        ) ?? null,
      })),
    });
  } catch (error) {
    const status = errorStatus(error);
    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }
    console.error("GET /api/campaigns:", error);
    return NextResponse.json(
      { error: "Unable to load campaigns." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body: unknown = await request.json();
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Please correct the campaign details.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    if (input.rewardPerCreator * input.maxCreators > input.budget) {
      return NextResponse.json(
        { error: "Budget must cover rewards for all creator slots." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const { organization } = await requireOrganizationRole(
      input.organizationId,
      ORGANIZATION_PERMISSIONS.manageCampaigns,
    );

    if (
      input.status === "active" &&
      input.isPublic &&
      input.applicationDeadline &&
      input.applicationDeadline <= new Date()
    ) {
      return NextResponse.json(
        { error: "An active campaign needs a future application deadline." },
        { status: 400 },
      );
    }

    const campaign = await Campaign.create({
      ...input,
      organizationId: organization._id,
      createdBy: new mongoose.Types.ObjectId(session.userId),
      slug: campaignSlug(input.title),
    });

    return NextResponse.json(
      { campaign: campaign.toObject() },
      { status: 201 },
    );
  } catch (error) {
    const status = errorStatus(error);
    if (status === 401 || status === 403 || status === 404) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Access denied." },
        { status },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    console.error("POST /api/campaigns:", error);
    return NextResponse.json(
      { error: "Unable to create campaign." },
      { status: 500 },
    );
  }
}
