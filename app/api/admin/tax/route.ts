import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { listTaxProfiles } from "@/services/tax.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const status = req.nextUrl.searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | "all"
      | null;

    const profiles = await listTaxProfiles({ status: status ?? "pending" });
    return NextResponse.json({ profiles });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET admin tax:", error);
    return NextResponse.json({ error: "Unable to load." }, { status: 500 });
  }
}
