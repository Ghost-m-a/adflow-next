import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { rejectTaxProfile, TaxError } from "@/services/tax.service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ profileId: string }> },
) {
  try {
    const session = await requireAdmin();
    const { profileId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const reason = (body as { reason?: string } | null)?.reason;
    if (typeof reason !== "string") {
      return NextResponse.json({ error: "Reason required." }, { status: 400 });
    }

    await connectToDatabase();
    const profile = await rejectTaxProfile(profileId, session.userId, reason);
    return NextResponse.json({
      profile: { _id: profile._id.toString(), status: profile.status },
    });
  } catch (error) {
    if (error instanceof AdminAuthError || error instanceof TaxError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Reject tax:", error);
    return NextResponse.json({ error: "Unable to reject." }, { status: 500 });
  }
}
