import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getPublicCampaignBySlug } from "@/services/public-campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    await connectToDatabase();
    const campaign = await getPublicCampaignBySlug(slug);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("GET public campaign:", error);
    return NextResponse.json({ error: "Unable to load campaign." }, { status: 500 });
  }
}
