import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getWebhookStats,
  listWebhookEvents,
  listWebhookProviders,
} from "@/services/webhook.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const [events, providers, stats] = await Promise.all([
      listWebhookEvents({
        provider: sp.get("provider") ?? undefined,
        status: sp.get("status") ?? undefined,
      }),
      listWebhookProviders(),
      getWebhookStats(),
    ]);

    return NextResponse.json({ events, providers, stats });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET admin webhooks:", error);
    return NextResponse.json({ error: "Unable to load webhooks." }, { status: 500 });
  }
}
