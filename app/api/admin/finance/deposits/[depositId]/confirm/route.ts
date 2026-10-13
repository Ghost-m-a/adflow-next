import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { WalletError, confirmDeposit } from "@/services/wallet.service";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ depositId: string }> },
) {
  try {
    await requireAdmin();
    const { depositId } = await ctx.params;
    if (!mongoose.isValidObjectId(depositId)) {
      return NextResponse.json({ error: "Invalid deposit." }, { status: 400 });
    }

    await connectToDatabase();
    const deposit = await confirmDeposit(depositId);

    return NextResponse.json({
      deposit: {
        _id: deposit._id.toString(),
        status: deposit.status,
        amount: deposit.amount,
        currency: deposit.currency,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Confirm deposit:", error);
    return NextResponse.json({ error: "Unable to confirm deposit." }, { status: 500 });
  }
}
