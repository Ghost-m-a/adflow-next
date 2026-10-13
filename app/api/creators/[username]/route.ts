import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getPublicProfile } from "@/services/creator-profile.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await ctx.params;
    await connectToDatabase();
    const profile = await getPublicProfile(username);
    if (!profile) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET creator profile:", error);
    return NextResponse.json(
      { error: "Unable to load profile." },
      { status: 500 },
    );
  }
}
