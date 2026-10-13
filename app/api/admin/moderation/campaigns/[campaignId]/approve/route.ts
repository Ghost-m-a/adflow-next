import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import {
  ModerationError,
  approveCampaign,
} from "@/services/moderation.service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await requireAdmin();
    const { campaignId } = await ctx.params;
    await connectToDatabase();

    const campaign = await approveCampaign(campaignId, session.userId);

    return NextResponse.json({
      campaign: {
        _id: campaign._id.toString(),
        status: campaign.status,
        moderationStatus: campaign.moderationStatus,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModerationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Approve campaign:", error);
    return NextResponse.json({ error: "Unable to approve." }, { status: 500 });
  }
}
