import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import LedgerEntry from "@/models/LedgerEntry";
import { minPayoutFor } from "@/lib/payments/provider";
import { getCreatorBalances } from "@/services/ledger.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const [balances, recent] = await Promise.all([
      getCreatorBalances(session.userId),
      LedgerEntry.find({
        userId: session.userId,
        type: { $in: ["credit", "reversal"] },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const thresholds: Record<string, number> = {};
    for (const currency of Object.keys(balances)) {
      thresholds[currency] = minPayoutFor(currency);
    }

    return NextResponse.json({
      balances,
      thresholds,
      entries: recent.map((e) => ({
        _id: e._id.toString(),
        type: e.type,
        status: e.status,
        amount: e.amount,
        currency: e.currency,
        reference: e.reference,
        description: e.description ?? "",
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load earnings." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
