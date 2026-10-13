import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { scoreCampaignsForCreator } from "@/services/matching.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();
    const matches = await scoreCampaignsForCreator({
      userId: session.userId,
      limit: 20,
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
