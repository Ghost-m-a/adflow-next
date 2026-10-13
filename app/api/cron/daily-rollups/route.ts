import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { backfillRollups, runDailyRollups } from "@/jobs/daily-rollups.job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Cron secret not configured." }, { status: 503 });
    }
    const header = req.headers.get("authorization") ?? "";
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await connectToDatabase();

    const backfill = req.nextUrl.searchParams.get("backfill");
    if (backfill) {
      const days = Math.max(1, Math.min(Number(backfill), 180));
      const results = await backfillRollups(days);
      return NextResponse.json({
        ok: true,
        mode: "backfill",
        days,
        results: results.map((r) => ({
          date: r.date,
          rows: r.rowsWritten,
          errors: r.errors.length,
        })),
      });
    }

    const result = await runDailyRollups();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Daily rollups job failed:", error);
    return NextResponse.json({ error: "Job failed." }, { status: 500 });
  }
}
