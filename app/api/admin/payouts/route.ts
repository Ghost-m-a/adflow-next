import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import User from "@/models/User";
import Payout from "@/models/Payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await requireSession();
  await connectToDatabase();
  const user = await User.findById(session.userId).select("platformRole").lean();
  if (!user || user.platformRole !== "admin") {
    throw Object.assign(new Error("Admin access required."), { statusCode: 403 });
  }
  return session;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const status = req.nextUrl.searchParams.get("status");
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;

    const payouts = await Payout.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({ path: "userId", select: "_id name username email" })
      .lean();

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        _id: p._id.toString(),
        user: p.userId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        reference: p.reference,
        provider: p.provider,
        providerReference: p.providerReference ?? null,
        destinationLabel: p.destinationSnapshot?.label ?? "",
        requestedAt: p.requestedAt,
        processedAt: p.processedAt ?? null,
        failedAt: p.failedAt ?? null,
        failureReason: p.failureReason ?? null,
      })),
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
