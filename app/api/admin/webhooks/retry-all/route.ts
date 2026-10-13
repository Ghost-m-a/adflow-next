import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { retryAllFailed } from "@/services/webhook.service";

export async function POST() {
  try {
    await requireAdmin();
    await connectToDatabase();

    const results = await retryAllFailed(50);
    const ok = results.filter((r) => r.ok).length;

    return NextResponse.json({
      attempted: results.length,
      succeeded: ok,
      failed: results.length - ok,
      results,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST retry-all webhooks:", error);
    return NextResponse.json({ error: "Unable to retry events." }, { status: 500 });
  }
}
