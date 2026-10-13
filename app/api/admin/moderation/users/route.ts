import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { listUsersForModeration } from "@/services/moderation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const users = await listUsersForModeration({
      status:
        sp.get("status") === "suspended"
          ? "suspended"
          : sp.get("status") === "active"
            ? "active"
            : "all",
      q: sp.get("q") ?? undefined,
    });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET moderation users:", error);
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}
