import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import {
  PayoutError,
  cancelPayout,
} from "@/services/payout.service";
import Payout from "@/models/Payout";

type Context = { params: Promise<{ payoutId: string }> };

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { payoutId } = await ctx.params;
    if (!mongoose.isValidObjectId(payoutId)) {
      return NextResponse.json({ error: "Invalid payout." }, { status: 400 });
    }

    await connectToDatabase();
    const payout = await Payout.findOne({
      _id: payoutId,
      userId: session.userId,
    }).lean();

    if (!payout) {
      return NextResponse.json({ error: "Payout not found." }, { status: 404 });
    }

    return NextResponse.json({
      payout: {
        ...payout,
        _id: payout._id.toString(),
        userId: payout.userId.toString(),
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load payout." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { payoutId } = await ctx.params;
    if (!mongoose.isValidObjectId(payoutId)) {
      return NextResponse.json({ error: "Invalid payout." }, { status: 400 });
    }

    await connectToDatabase();
    const payout = await cancelPayout(payoutId, session.userId);

    return NextResponse.json({
      payout: {
        _id: payout._id.toString(),
        status: payout.status,
      },
    });
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
      { error: error instanceof Error ? error.message : "Unable to cancel payout." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
