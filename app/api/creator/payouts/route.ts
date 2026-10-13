import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Payout from "@/models/Payout";
import { minPayoutFor } from "@/lib/payments/provider";
import { getCreatorBalances } from "@/services/ledger.service";
import { PayoutError, requestPayout } from "@/services/payout.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const [payouts, balances] = await Promise.all([
      Payout.find({ userId: session.userId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      getCreatorBalances(session.userId),
    ]);

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        _id: p._id.toString(),
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        reference: p.reference,
        provider: p.provider,
        destinationLabel: p.destinationSnapshot?.label ?? "",
        requestedAt: p.requestedAt,
        processedAt: p.processedAt ?? null,
        failedAt: p.failedAt ?? null,
        failureReason: p.failureReason ?? null,
      })),
      balances,
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load payouts." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const currency = (body as Record<string, unknown>).currency;
    const accountId = (body as Record<string, unknown>).accountId;

    if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "A three-letter currency code is required." },
        { status: 400 },
      );
    }

    const payout = await requestPayout({
      userId: session.userId,
      currency: currency.toUpperCase(),
      accountId: typeof accountId === "string" ? accountId : undefined,
    });

    return NextResponse.json(
      {
        payout: {
          _id: payout._id.toString(),
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          reference: payout.reference,
          minimum: minPayoutFor(payout.currency),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PayoutError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }
    console.error("POST payout request:", error);
    return NextResponse.json({ error: "Unable to request payout." }, { status: 500 });
  }
}
