import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { WebhookError, retryWebhookEvent } from "@/services/webhook.service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAdmin();
    const { eventId } = await ctx.params;
    await connectToDatabase();

    const result = await retryWebhookEvent(eventId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof WebhookError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST retry webhook:", error);
    return NextResponse.json({ error: "Unable to retry event." }, { status: 500 });
  }
}
