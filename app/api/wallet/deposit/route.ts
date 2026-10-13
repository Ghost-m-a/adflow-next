import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import Organization from "@/models/Organization";
import WalletDeposit from "@/models/WalletDeposit";
import {
  WalletError,
  confirmDeposit,
  createDeposit,
} from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET returns deposit history for the given organization.
 * POST starts a new deposit — for the "mock" provider, this returns
 * a checkout URL that immediately confirms on redirect.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const organizationId = req.nextUrl.searchParams.get("organizationId");
    if (!organizationId || !mongoose.isValidObjectId(organizationId)) {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);

    await connectToDatabase();
    const deposits = await WalletDeposit.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    void session;

    return NextResponse.json({
      deposits: deposits.map((d) => ({
        _id: d._id.toString(),
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        provider: d.provider,
        checkoutUrl: d.checkoutUrl ?? null,
        createdAt: d.createdAt,
        completedAt: d.completedAt ?? null,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load deposits." },
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
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const organizationId = b.organizationId;
    const amount = b.amount;
    const currency = b.currency;

    if (typeof organizationId !== "string" || !mongoose.isValidObjectId(organizationId)) {
      return NextResponse.json({ error: "Invalid organization." }, { status: 400 });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1) {
      return NextResponse.json(
        { error: "Amount must be a number of at least 1." },
        { status: 400 },
      );
    }
    if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Invalid currency." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);

    const org = await Organization.findById(organizationId).select("name").lean();
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const origin = req.nextUrl.origin;

    const deposit = await createDeposit({
      organizationId,
      organizationName: org.name,
      userId: session.userId,
      amount,
      currency,
      appOrigin: origin,
    });

    // Only mock deposits auto-confirm. Real Stripe confirms via webhook.
    if (deposit.provider === "mock") {
      await confirmDeposit(deposit._id.toString(), deposit.providerSessionId);
    }

    return NextResponse.json(
      {
        deposit: {
          _id: deposit._id.toString(),
          amount: deposit.amount,
          currency: deposit.currency,
          status: deposit.status,
          provider: deposit.provider,
          checkoutUrl: deposit.checkoutUrl ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if ([400, 401, 403, 404, 409].includes(status)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request denied." },
        { status },
      );
    }
    console.error("POST deposit:", error);
    return NextResponse.json({ error: "Unable to start deposit." }, { status: 500 });
  }
}
