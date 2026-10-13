import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { discoverProfiles } from "@/services/creator-profile.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const sp = req.nextUrl.searchParams;
    const profiles = await discoverProfiles({
      q: sp.get("q")?.trim().slice(0, 100) || undefined,
      niche: sp.get("niche")?.trim().slice(0, 60) || undefined,
      country: sp.get("country")?.trim().slice(0, 2) || undefined,
      limit: 30,
    });
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("GET discover creators:", error);
    return NextResponse.json(
      { error: "Unable to load creators." },
      { status: 500 },
    );
  }
}
