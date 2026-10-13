import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { listLedger } from "@/services/admin-finance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const entries = await listLedger({
      type: sp.get("type") ?? undefined,
      status: sp.get("status") ?? undefined,
      currency: sp.get("currency") ?? undefined,
      reference: sp.get("reference") ?? undefined,
      limit: 200,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET admin ledger:", error);
    return NextResponse.json({ error: "Unable to load ledger." }, { status: 500 });
  }
}
