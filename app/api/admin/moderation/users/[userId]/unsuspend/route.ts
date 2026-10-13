import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import {
  ModerationError,
  unsuspendUser,
} from "@/services/moderation.service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  try {
    await requireAdmin();
    const { userId } = await ctx.params;
    await connectToDatabase();

    const result = await unsuspendUser(userId);
    return NextResponse.json({ user: result });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModerationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Unsuspend user:", error);
    return NextResponse.json({ error: "Unable to unsuspend." }, { status: 500 });
  }
}
