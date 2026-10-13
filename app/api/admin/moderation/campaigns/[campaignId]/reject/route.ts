import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import {
  ModerationError,
  rejectCampaign,
} from "@/services/moderation.service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await requireAdmin();
    const { campaignId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const reason = (body as { reason?: string } | null)?.reason;
    if (typeof reason !== "string") {
      return NextResponse.json({ error: "Reason required." }, { status: 400 });
    }

    await connectToDatabase();
    const campaign = await rejectCampaign(campaignId, session.userId, reason);

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
    console.error("Reject campaign:", error);
    return NextResponse.json({ error: "Unable to reject." }, { status: 500 });
  }
}
