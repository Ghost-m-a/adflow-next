import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import PayoutAccount from "@/models/PayoutAccount";

type Context = { params: Promise<{ accountId: string }> };

export async function PATCH(req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { accountId } = await ctx.params;
    if (!mongoose.isValidObjectId(accountId)) {
      return NextResponse.json({ error: "Invalid account." }, { status: 400 });
    }

    await connectToDatabase();
    const account = await PayoutAccount.findOne({
      _id: accountId,
      userId: session.userId,
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;

    if (typeof input.label === "string") {
      const label = input.label.trim();
      if (!label || label.length > 120) {
        return NextResponse.json({ error: "Invalid label." }, { status: 400 });
      }
      account.label = label;
    }

    if (input.isDefault === true) {
      await PayoutAccount.updateMany(
        { userId: session.userId, currency: account.currency },
        { $set: { isDefault: false } },
      );
      account.isDefault = true;
    } else if (input.isDefault === false) {
      account.isDefault = false;
    }

    await account.save();

    return NextResponse.json({
      account: {
        _id: account._id.toString(),
        type: account.type,
        label: account.label,
        currency: account.currency,
        isDefault: account.isDefault,
        isVerified: account.isVerified,
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update account." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { accountId } = await ctx.params;
    if (!mongoose.isValidObjectId(accountId)) {
      return NextResponse.json({ error: "Invalid account." }, { status: 400 });
    }

    await connectToDatabase();
    const removed = await PayoutAccount.findOneAndDelete({
      _id: accountId,
      userId: session.userId,
    });

    if (!removed) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete account." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
