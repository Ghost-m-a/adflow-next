import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { retryPendingDeliveries } from "@/services/webhook-dispatcher.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Cron secret not configured." }, { status: 503 });
    }
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await connectToDatabase();
    const result = await retryPendingDeliveries(50);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Webhook retry job failed:", error);
    return NextResponse.json({ error: "Job failed." }, { status: 500 });
  }
}
