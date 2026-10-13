import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { listDeposits } from "@/services/admin-finance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const status = req.nextUrl.searchParams.get("status") ?? "all";
    const deposits = await listDeposits({ status, limit: 200 });

    return NextResponse.json({ deposits });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET admin deposits:", error);
    return NextResponse.json({ error: "Unable to load deposits." }, { status: 500 });
  }
}
