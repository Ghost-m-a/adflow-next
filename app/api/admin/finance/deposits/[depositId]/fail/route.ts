import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { WalletError, failDeposit } from "@/services/wallet.service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ depositId: string }> },
) {
  try {
    await requireAdmin();
    const { depositId } = await ctx.params;
    if (!mongoose.isValidObjectId(depositId)) {
      return NextResponse.json({ error: "Invalid deposit." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reason =
      typeof (body as Record<string, unknown>).reason === "string"
        ? ((body as Record<string, unknown>).reason as string)
        : "Failed by admin";

    await connectToDatabase();
    const deposit = await failDeposit(depositId, reason);

    return NextResponse.json({
      deposit: {
        _id: deposit._id.toString(),
        status: deposit.status,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Fail deposit:", error);
    return NextResponse.json({ error: "Unable to fail deposit." }, { status: 500 });
  }
}
