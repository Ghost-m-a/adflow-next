import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import TrackingLink from "@/models/TrackingLink";
import {
  CLICK_ID_PARAM,
  extractClientIp,
  hashTrackingToken,
} from "@/lib/tracking/token";
import { recordClick } from "@/services/attribution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    await connectToDatabase();

    const link = await TrackingLink.findOne({
      tokenHash: hashTrackingToken(token),
      isActive: true,
    }).lean();

    if (!link) {
      return new NextResponse("Link not found or inactive", { status: 404 });
    }

    // Record the click (deduped on fingerprint).
    const { click } = await recordClick({
      trackingLink: {
        _id: link._id,
        campaignId: link.campaignId,
        creatorId: link.creatorId,
      },
      ip: extractClientIp(request.headers),
      userAgent: request.headers.get("user-agent") ?? "",
      referrer: request.headers.get("referer") ?? undefined,
    });

    // Append the click id so the destination can capture it.
    const destination = new URL(link.destinationUrl);
    destination.searchParams.set(CLICK_ID_PARAM, click._id.toString());

    return NextResponse.redirect(destination.toString(), {
      status: 302,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Tracking redirect failed:", error);
    return new NextResponse("Redirect failed", { status: 500 });
  }
}
