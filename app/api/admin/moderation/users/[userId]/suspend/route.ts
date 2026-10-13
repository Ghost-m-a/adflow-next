import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import {
  ModerationError,
  suspendUser,
} from "@/services/moderation.service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await requireAdmin();
    const { userId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const reason = (body as { reason?: string } | null)?.reason;
    if (typeof reason !== "string") {
      return NextResponse.json({ error: "Reason required." }, { status: 400 });
    }

    await connectToDatabase();
    const result = await suspendUser({
      userId,
      adminId: session.userId,
      reason,
    });

    return NextResponse.json({ user: result });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModerationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Suspend user:", error);
    return NextResponse.json({ error: "Unable to suspend." }, { status: 500 });
  }
}
