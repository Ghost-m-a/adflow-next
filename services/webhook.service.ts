import mongoose from "mongoose";

import WebhookEvent from "@/models/WebhookEvent";
import Campaign from "@/models/Campaign";
import { recordConversion } from "@/services/conversion.service";

export class WebhookError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "WebhookError";
    this.statusCode = statusCode;
  }
}

/** List webhook events with filters. */
export async function listWebhookEvents(input: {
  provider?: string;
  status?: string;
  limit?: number;
}) {
  const filter: Record<string, unknown> = {};
  if (input.provider && input.provider !== "all") {
    filter.provider = input.provider;
  }
  if (input.status && input.status !== "all") {
    filter.status = input.status;
  }

  const events = await WebhookEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(input.limit ?? 100, 300))
    .lean();

  return events.map((e) => ({
    _id: e._id.toString(),
    provider: e.provider,
    eventType: e.eventType,
    externalId: e.externalId,
    status: e.status,
    error: e.error ?? null,
    processedAt: e.processedAt ?? null,
    createdAt: e.createdAt,
  }));
}

export async function getWebhookEvent(eventId: string) {
  if (!mongoose.isValidObjectId(eventId)) {
    throw new WebhookError("Invalid event.", 400);
  }
  const event = await WebhookEvent.findById(eventId).lean();
  if (!event) throw new WebhookError("Webhook event not found.", 404);

  return {
    _id: event._id.toString(),
    provider: event.provider,
    eventType: event.eventType,
    externalId: event.externalId,
    status: event.status,
    error: event.error ?? null,
    processedAt: event.processedAt ?? null,
    createdAt: event.createdAt,
    payload: event.payload,
  };
}

/** Distinct providers with counts, for the filter dropdown. */
export async function listWebhookProviders() {
  const rows = await WebhookEvent.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$provider", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ provider: r._id, count: r.count }));
}

/**
 * Re-process a failed webhook. Uses the same logic as the live receiver —
 * any input the original handler would have accepted is replayed here.
 * A successful retry flips the event to "processed" and stores the
 * conversion id in the payload for traceability.
 */
export async function retryWebhookEvent(eventId: string) {
  if (!mongoose.isValidObjectId(eventId)) {
    throw new WebhookError("Invalid event.", 400);
  }

  const event = await WebhookEvent.findById(eventId);
  if (!event) throw new WebhookError("Webhook event not found.", 404);
  if (event.status === "processed") {
    throw new WebhookError("Event is already processed.", 409);
  }

  const payload = event.payload as Record<string, unknown>;

  try {
    const campaignId = String(
      payload.campaignId ?? payload.campaign_id ?? "",
    );
    const amount = Number(payload.amount ?? payload.value ?? 0);
    const currency = String(payload.currency ?? "USD").toUpperCase();
    const clickId =
      typeof payload.clickId === "string"
        ? payload.clickId
        : typeof payload.adflow_click === "string"
          ? payload.adflow_click
          : undefined;

    if (!campaignId || !Number.isFinite(amount) || amount <= 0) {
      throw new WebhookError(
        "Payload is missing campaignId or amount — cannot retry.",
      );
    }

    const campaign = await Campaign.findById(campaignId)
      .select("organizationId")
      .lean();
    if (!campaign) {
      throw new WebhookError("Campaign no longer exists.", 404);
    }

    const idempotencyKey = `${event.provider}:${event.externalId}`;

    const { conversion, deduplicated } = await recordConversion({
      campaignId,
      advertiserOrganizationId: campaign.organizationId.toString(),
      amount,
      currency,
      clickId,
      idempotencyKey,
      source: "webhook",
      externalId: event.externalId,
      customerRef:
        typeof payload.customerRef === "string"
          ? payload.customerRef
          : undefined,
      metadata: payload,
    });

    event.status = "processed";
    event.processedAt = new Date();
    event.error = undefined;
    event.payload = {
      ...payload,
      _retriedAt: new Date().toISOString(),
      _conversionId: conversion._id.toString(),
      _deduplicated: deduplicated,
    };
    await event.save();

    return {
      eventId: event._id.toString(),
      conversionId: conversion._id.toString(),
      deduplicated,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Retry failed.";
    event.status = "failed";
    event.error = message;
    await event.save();
    throw new WebhookError(`Retry failed: ${message}`, 500);
  }
}

/** Summary counts for the dashboard tiles. */
export async function getWebhookStats() {
  const [received, processed, failed] = await Promise.all([
    WebhookEvent.countDocuments({ status: "received" }),
    WebhookEvent.countDocuments({ status: "processed" }),
    WebhookEvent.countDocuments({ status: "failed" }),
  ]);
  return { received, processed, failed, total: received + processed + failed };
}

/** Retry every failed event. Bounded to avoid runaway processing. */
export async function retryAllFailed(max = 50) {
  const events = await WebhookEvent.find({ status: "failed" })
    .sort({ createdAt: -1 })
    .limit(max)
    .select("_id")
    .lean();

  const results: Array<{ eventId: string; ok: boolean; error?: string }> = [];

  for (const e of events) {
    try {
      await retryWebhookEvent(e._id.toString());
      results.push({ eventId: e._id.toString(), ok: true });
    } catch (err) {
      results.push({
        eventId: e._id.toString(),
        ok: false,
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  return results;
}
