import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { listOrganizationFinances } from "@/services/admin-finance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();
    const organizations = await listOrganizationFinances();
    return NextResponse.json({ organizations });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET admin organizations:", error);
    return NextResponse.json({ error: "Unable to load organizations." }, { status: 500 });
  }
}
