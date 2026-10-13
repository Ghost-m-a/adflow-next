import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

import { connectToDatabase } from "@/lib/db/mongodb";
import WebhookEvent from "@/models/WebhookEvent";
import Campaign from "@/models/Campaign";
import { recordConversion } from "@/services/conversion.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ provider: string }> };

function verifySignature(
  secret: string,
  payload: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest, ctx: Context) {
  const { provider } = await ctx.params;

  const raw = await request.text();
  const signature = request.headers.get("x-adflow-signature") ?? "";
  const secret = process.env[`WEBHOOK_SECRET_${provider.toUpperCase()}`];

  if (!secret) {
    return NextResponse.json(
      { error: `Webhook secret not configured for ${provider}.` },
      { status: 503 },
    );
  }

  if (!signature || !verifySignature(secret, raw, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const externalId =
    typeof body.id === "string"
      ? body.id
      : typeof body.externalId === "string"
        ? body.externalId
        : typeof body.event_id === "string"
          ? body.event_id
          : "";

  if (!externalId) {
    return NextResponse.json(
      { error: "Missing external event id." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  // Webhook-level dedupe.
  const existing = await WebhookEvent.findOne({ provider, externalId })
    .select("_id status")
    .lean();

  if (existing) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  const record = await WebhookEvent.create({
    provider,
    eventType: typeof body.type === "string" ? body.type : "conversion",
    externalId,
    payload: body,
    status: "received",
  });

  try {
    const campaignId = String(body.campaignId ?? body.campaign_id ?? "");
    const amount = Number(body.amount ?? body.value ?? 0);
    const currency = String(body.currency ?? "USD").toUpperCase();
    const clickId =
      typeof body.clickId === "string"
        ? body.clickId
        : typeof body.adflow_click === "string"
          ? body.adflow_click
          : undefined;

    if (!campaignId || !Number.isFinite(amount) || amount <= 0) {
      throw Object.assign(new Error("Missing campaignId or amount."), {
        statusCode: 400,
      });
    }

    const campaign = await Campaign.findById(campaignId).select("organizationId").lean();
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found."), { statusCode: 404 });
    }

    const idempotencyKey = `${provider}:${externalId}`;

    const { conversion } = await recordConversion({
      campaignId,
      advertiserOrganizationId: campaign.organizationId.toString(),
      amount,
      currency,
      clickId,
      idempotencyKey,
      source: "webhook",
      externalId,
      customerRef:
        typeof body.customerRef === "string" ? body.customerRef : undefined,
      metadata: body,
    });

    await WebhookEvent.updateOne(
      { _id: record._id },
      { $set: { status: "processed", processedAt: new Date() } },
    );

    return NextResponse.json({
      received: true,
      conversionId: conversion._id.toString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Conversion failed.";
    await WebhookEvent.updateOne(
      { _id: record._id },
      { $set: { status: "failed", error: message } },
    );
    console.error("Webhook conversion failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
