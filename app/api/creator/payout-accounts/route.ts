import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import PayoutAccount, {
  PAYOUT_ACCOUNT_TYPES,
  type PayoutAccountType,
} from "@/models/PayoutAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const accounts = await PayoutAccount.find({ userId: session.userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        _id: a._id.toString(),
        type: a.type,
        label: a.label,
        currency: a.currency,
        isDefault: a.isDefault,
        isVerified: a.isVerified,
        createdAt: a.createdAt,
        // Never return full account details.
        detailsMasked: Object.fromEntries(
          Object.entries(detailsToObject(a.details)).map(([k, v]) => [
            k,
            maskValue(v),
          ]),
        ),
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load accounts." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

function detailsToObject(details: unknown): Record<string, string> {
  if (details instanceof Map) {
    return Object.fromEntries(details as Map<string, string>);
  }
  if (details && typeof details === "object") {
    return details as Record<string, string>;
  }
  return {};
}

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(value.length - 4)}${value.slice(-4)}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const type = input.type;
    const label = input.label;
    const currency = input.currency;
    const details = input.details;
    const makeDefault = input.isDefault === true;

    if (
      typeof type !== "string" ||
      !PAYOUT_ACCOUNT_TYPES.includes(type as PayoutAccountType)
    ) {
      return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
    }
    if (typeof label !== "string" || !label.trim() || label.length > 120) {
      return NextResponse.json(
        { error: "Label is required and must be at most 120 characters." },
        { status: 400 },
      );
    }
    if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "Currency must be a three-letter code." },
        { status: 400 },
      );
    }
    if (!details || typeof details !== "object" || Array.isArray(details)) {
      return NextResponse.json(
        { error: "details must be an object." },
        { status: 400 },
      );
    }

    // Enforce a single default per currency.
    if (makeDefault) {
      await PayoutAccount.updateMany(
        { userId: session.userId, currency: currency.toUpperCase() },
        { $set: { isDefault: false } },
      );
    }

    const account = await PayoutAccount.create({
      userId: new mongoose.Types.ObjectId(session.userId),
      type: type as PayoutAccountType,
      label: label.trim(),
      currency: currency.toUpperCase(),
      details: details as Record<string, string>,
      isDefault: makeDefault,
    });

    return NextResponse.json(
      {
        account: {
          _id: account._id.toString(),
          type: account.type,
          label: account.label,
          currency: account.currency,
          isDefault: account.isDefault,
          isVerified: account.isVerified,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add account." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
