import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminAuthError, requireAdmin } from "@/lib/auth/requireAdmin";
import { RefundError, refundConversion } from "@/services/admin-finance.service";
import Conversion from "@/models/Conversion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const status = req.nextUrl.searchParams.get("status") ?? "approved";
    const filter: Record<string, unknown> = {};
    if (status !== "all") filter.status = status;

    const conversions = await Conversion.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      conversions: conversions.map((c) => ({
        _id: c._id.toString(),
        campaignId: c.campaignId.toString(),
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        source: c.source,
        externalId: c.externalId ?? null,
        createdAt: c.createdAt,
        approvedAt: c.approvedAt ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET admin refunds:", error);
    return NextResponse.json({ error: "Unable to load refunds." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { conversionId, reason } = body as {
      conversionId?: unknown;
      reason?: unknown;
    };

    if (typeof conversionId !== "string" || !mongoose.isValidObjectId(conversionId)) {
      return NextResponse.json({ error: "Invalid conversionId." }, { status: 400 });
    }
    if (typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "A reason of at least 5 characters is required." },
        { status: 400 },
      );
    }

    const result = await refundConversion({
      conversionId,
      adminId: session.userId,
      reason: reason.trim(),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST refund:", error);
    return NextResponse.json({ error: "Unable to process refund." }, { status: 500 });
  }
}
