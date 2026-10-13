import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { approveTaxProfile, TaxError } from "@/services/tax.service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ profileId: string }> },
) {
  try {
    const session = await requireAdmin();
    const { profileId } = await ctx.params;
    await connectToDatabase();
    const profile = await approveTaxProfile(profileId, session.userId);
    return NextResponse.json({
      profile: { _id: profile._id.toString(), status: profile.status },
    });
  } catch (error) {
    if (error instanceof AdminAuthError || error instanceof TaxError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Approve tax:", error);
    return NextResponse.json({ error: "Unable to approve." }, { status: 500 });
  }
}
