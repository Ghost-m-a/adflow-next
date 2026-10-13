import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { WebhookError, getWebhookEvent } from "@/services/webhook.service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAdmin();
    const { eventId } = await ctx.params;
    await connectToDatabase();

    const event = await getWebhookEvent(eventId);
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof WebhookError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET admin webhook:", error);
    return NextResponse.json({ error: "Unable to load event." }, { status: 500 });
  }
}
