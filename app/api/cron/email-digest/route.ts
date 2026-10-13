import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { runEmailDigest } from "@/jobs/email-digest.job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron-triggered endpoint.
 *
 * Deploy with a scheduler that hits this once per day, e.g.:
 *   - Vercel Cron:  add "crons": [{ "path": "/api/cron/email-digest", "schedule": "0 9 * * *" }] to vercel.json
 *   - GitHub Actions:  scheduled workflow with a curl POST
 *   - Self-hosted:  cron job curling the URL
 *
 * Protected by a bearer token in the Authorization header.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Cron secret not configured." },
        { status: 503 },
      );
    }

    const header = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;
    if (header !== expected) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await connectToDatabase();
    const result = await runEmailDigest({ maxUsers: 200 });

    return NextResponse.json({
      ok: true,
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email digest job failed:", error);
    return NextResponse.json(
      { error: "Digest job failed." },
      { status: 500 },
    );
  }
}
