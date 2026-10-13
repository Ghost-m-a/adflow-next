import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Organization from "@/models/Organization";
import { getAgencyOverview } from "@/services/agency.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const agencyId = req.nextUrl.searchParams.get("agencyId");
    if (!agencyId) {
      return NextResponse.json({ error: "agencyId required." }, { status: 400 });
    }

    await connectToDatabase();
    const agency = await Organization.findById(agencyId).select("ownerId").lean();
    if (!agency || agency.ownerId.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const overview = await getAgencyOverview(agencyId);
    return NextResponse.json(overview);
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
