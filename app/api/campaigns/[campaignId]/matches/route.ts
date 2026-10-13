import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Campaign from "@/models/Campaign";
import { scoreCreatorsForCampaign } from "@/services/matching.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ campaignId: string }> },
) {
  try {
    await requireSession();
    const { campaignId } = await ctx.params;
    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
    }

    await connectToDatabase();
    const campaign = await Campaign.findById(campaignId)
      .select("organizationId")
      .lean();
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      campaign.organizationId.toString(),
      ORGANIZATION_PERMISSIONS.manageCampaigns,
    );

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") ?? 20),
      50,
    );

    const matches = await scoreCreatorsForCampaign({
      campaignId,
      limit,
    });

    return NextResponse.json({ matches });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load matches." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
