import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import User from "@/models/User";
import CreatorProfile from "@/models/CreatorProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const profile = await CreatorProfile.findOne({
      userId: session.userId,
    }).lean();

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        _id: profile._id.toString(),
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl ?? "",
        country: profile.country ?? "",
        languages: profile.languages ?? [],
        niches: profile.niches ?? [],
        socialLinks: profile.socialLinks ?? [],
        isPublic: profile.isPublic,
        isVerified: profile.isVerified,
      },
    });
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

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const displayName = typeof b.displayName === "string" ? b.displayName.trim() : "";
    if (!displayName || displayName.length < 2) {
      return NextResponse.json(
        { error: "displayName is required (min 2 chars)." },
        { status: 400 },
      );
    }

    const user = await User.findById(session.userId).select("username").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const existing = await CreatorProfile.findOne({ userId: session.userId });
    if (existing) {
      existing.displayName = displayName;
      existing.bio = typeof b.bio === "string" ? b.bio.slice(0, 2000) : existing.bio;
      existing.country =
        typeof b.country === "string" ? b.country.toUpperCase().slice(0, 2) : existing.country;
      existing.niches = Array.isArray(b.niches)
        ? (b.niches as string[]).filter((n) => typeof n === "string").slice(0, 20)
        : existing.niches;
      existing.languages = Array.isArray(b.languages)
        ? (b.languages as string[]).filter((n) => typeof n === "string").slice(0, 20)
        : existing.languages;
      existing.socialLinks = Array.isArray(b.socialLinks)
        ? (b.socialLinks as Array<{ platform: string; url: string; handle?: string }>)
            .filter((s) => typeof s.platform === "string" && typeof s.url === "string")
            .slice(0, 10)
        : existing.socialLinks;
      existing.isPublic = typeof b.isPublic === "boolean" ? b.isPublic : existing.isPublic;
      await existing.save();
      return NextResponse.json({
        profile: {
          _id: existing._id.toString(),
          username: existing.username,
          displayName: existing.displayName,
        },
        updated: true,
      });
    }

    const profile = await CreatorProfile.create({
      userId: session.userId,
      username: user.username,
      displayName,
      bio: typeof b.bio === "string" ? b.bio.slice(0, 2000) : undefined,
      country:
        typeof b.country === "string" ? b.country.toUpperCase().slice(0, 2) : undefined,
      niches: Array.isArray(b.niches)
        ? (b.niches as string[]).filter((n) => typeof n === "string").slice(0, 20)
        : [],
      languages: Array.isArray(b.languages)
        ? (b.languages as string[]).filter((n) => typeof n === "string").slice(0, 20)
        : [],
      socialLinks: Array.isArray(b.socialLinks)
        ? (b.socialLinks as Array<{ platform: string; url: string; handle?: string }>)
            .filter((s) => typeof s.platform === "string" && typeof s.url === "string")
            .slice(0, 10)
        : [],
      isPublic: typeof b.isPublic === "boolean" ? b.isPublic : true,
    });

    return NextResponse.json(
      {
        profile: {
          _id: profile._id.toString(),
          username: profile.username,
          displayName: profile.displayName,
        },
        created: true,
      },
      { status: 201 },
    );
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "A profile with this username already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
