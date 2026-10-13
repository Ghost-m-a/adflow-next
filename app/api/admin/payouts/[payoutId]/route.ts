import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import User from "@/models/User";
import { PayoutError, failPayout, markPayoutPaid } from "@/services/payout.service";

type Context = { params: Promise<{ payoutId: string }> };

async function requireAdmin() {
  const session = await requireSession();
  await connectToDatabase();
  const user = await User.findById(session.userId).select("platformRole").lean();
  if (!user || user.platformRole !== "admin") {
    throw Object.assign(new Error("Admin access required."), { statusCode: 403 });
  }
  return session;
}

export async function PATCH(req: NextRequest, ctx: Context) {
  try {
    await requireAdmin();
    const { payoutId } = await ctx.params;
    if (!mongoose.isValidObjectId(payoutId)) {
      return NextResponse.json({ error: "Invalid payout." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const action = (body as Record<string, unknown>).action;
    const providerReference = (body as Record<string, unknown>).providerReference;
    const reason = (body as Record<string, unknown>).reason;

    if (action === "mark-paid") {
      const payout = await markPayoutPaid(
        payoutId,
        typeof providerReference === "string" ? providerReference : undefined,
      );
      return NextResponse.json({
        payout: { _id: payout._id.toString(), status: payout.status },
      });
    }

    if (action === "mark-failed") {
      if (typeof reason !== "string" || !reason.trim()) {
        return NextResponse.json(
          { error: "reason is required to mark a payout failed." },
          { status: 400 },
        );
      }
      const payout = await failPayout(payoutId, reason);
      return NextResponse.json({
        payout: { _id: payout._id.toString(), status: payout.status },
      });
    }

    return NextResponse.json(
      { error: 'action must be "mark-paid" or "mark-failed".' },
      { status: 400 },
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update payout." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
