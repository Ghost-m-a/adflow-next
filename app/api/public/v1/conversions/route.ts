import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Conversion from "@/models/Conversion";
import Campaign from "@/models/Campaign";
import { requireApiKey } from "@/lib/api-keys/middleware";
import { recordConversion } from "@/services/conversion.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, "read:conversions");
  if (auth instanceof NextResponse) return auth;

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

  const filter: Record<string, unknown> = {
    advertiserOrganizationId: auth.organizationId,
  };
  if (status !== "all") filter.status = status;

  const conversions = await Conversion.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    data: conversions.map((c) => ({
      id: c._id.toString(),
      campaignId: c.campaignId.toString(),
      amount: c.amount,
      currency: c.currency,
      status: c.status,
      source: c.source,
      externalId: c.externalId ?? null,
      createdAt: c.createdAt,
      approvedAt: c.approvedAt ?? null,
    })),
    count: conversions.length,
  });
}

/**
 * Server-to-server conversion creation. Uses the API key for auth
 * rather than the HMAC webhook signature — useful for partners who
 * don't want to implement webhook signing.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req, "write:conversions");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const campaignId = b.campaignId;
  const amount = b.amount;
  const currency = b.currency;
  const idempotencyKey = b.idempotencyKey;
  const clickId = b.clickId;
  const externalId = b.externalId;

  if (typeof campaignId !== "string" || !mongoose.isValidObjectId(campaignId)) {
    return NextResponse.json({ error: "campaignId is invalid." }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be positive." }, { status: 400 });
  }
  if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "currency invalid." }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 6) {
    return NextResponse.json(
      { error: "idempotencyKey required (min 6 chars)." },
      { status: 400 },
    );
  }

  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizationId: auth.organizationId,
  })
    .select("organizationId")
    .lean();
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  try {
    const { conversion, deduplicated } = await recordConversion({
      campaignId,
      advertiserOrganizationId: auth.organizationId,
      amount,
      currency: currency.toUpperCase(),
      clickId: typeof clickId === "string" ? clickId : undefined,
      idempotencyKey: `api:${auth.keyId}:${idempotencyKey}`,
      source: "api",
      externalId: typeof externalId === "string" ? externalId : undefined,
      metadata: b,
    });

    return NextResponse.json(
      {
        data: {
          id: conversion._id.toString(),
          status: conversion.status,
          deduplicated,
        },
      },
      { status: deduplicated ? 200 : 201 },
    );
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
