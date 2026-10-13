import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import {
  listPendingCampaigns,
  listRejectedCampaigns,
} from "@/services/moderation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const status = req.nextUrl.searchParams.get("status") ?? "pending";
    const items =
      status === "rejected"
        ? await listRejectedCampaigns()
        : await listPendingCampaigns();

    return NextResponse.json({ campaigns: items });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET moderation campaigns:", error);
    return NextResponse.json({ error: "Unable to load queue." }, { status: 500 });
  }
}
