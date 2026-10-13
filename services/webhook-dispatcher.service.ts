import { createHmac } from "node:crypto";
import mongoose from "mongoose";

import Webhook, { type WebhookEventName } from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";

export type DispatchInput = {
  organizationId: string;
  event: WebhookEventName;
  payload: Record<string, unknown>;
};

function signPayload(secret: string, timestamp: number, body: string): string {
  const signed = `${timestamp}.${body}`;
  return createHmac("sha256", secret).update(signed).digest("hex");
}

/**
 * Delivers a single webhook attempt.
 * Called inline for the first try and from a retry job for subsequent tries.
 */
export async function deliverWebhook(
  webhookId: string,
  deliveryId: string,
) {
  const [webhook, delivery] = await Promise.all([
    Webhook.findById(webhookId).select("+secret").lean(),
    WebhookDelivery.findById(deliveryId),
  ]);

  if (!webhook || !delivery) return;
  if (!webhook.isActive) {
    delivery.status = "failed";
    delivery.error = "Webhook is disabled.";
    await delivery.save();
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    event: delivery.event,
    sentAt: new Date().toISOString(),
    data: delivery.payload,
  });
  const signature = signPayload(webhook.secret, timestamp, body);

  delivery.attempts += 1;
  delivery.lastAttemptAt = new Date();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ADFLOW-Webhooks/1.0",
        "X-ADFLOW-Event": delivery.event,
        "X-ADFLOW-Timestamp": String(timestamp),
        "X-ADFLOW-Signature": signature,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    delivery.responseStatus = res.status;
    const text = await res.text().catch(() => "");
    delivery.responseBody = text.slice(0, 2000);

    if (res.ok) {
      delivery.status = "delivered";
      delivery.deliveredAt = new Date();
      delivery.error = undefined;

      await Webhook.updateOne(
        { _id: webhook._id },
        {
          $set: { lastDeliveryAt: new Date(), consecutiveFailures: 0 },
        },
      );
    } else {
      delivery.status = delivery.attempts >= 5 ? "failed" : "pending";
      delivery.error = `HTTP ${res.status}`;

      await Webhook.updateOne(
        { _id: webhook._id },
        {
          $set: { lastFailureAt: new Date() },
          $inc: { consecutiveFailures: 1 },
        },
      );
    }
  } catch (error) {
    delivery.status = delivery.attempts >= 5 ? "failed" : "pending";
    delivery.error =
      error instanceof Error ? error.message : "Unknown delivery error.";

    await Webhook.updateOne(
      { _id: webhook._id },
      {
        $set: { lastFailureAt: new Date() },
        $inc: { consecutiveFailures: 1 },
      },
    );
  }

  await delivery.save();
}

/**
 * Fires an event to every active webhook subscribed to it.
 * Fire-and-forget — never blocks the caller.
 */
export function dispatchWebhookEvent(input: DispatchInput) {
  void (async () => {
    try {
      const webhooks = await Webhook.find({
        organizationId: new mongoose.Types.ObjectId(input.organizationId),
        isActive: true,
        events: input.event,
      })
        .select("_id")
        .lean();

      for (const hook of webhooks) {
        const delivery = await WebhookDelivery.create({
          webhookId: hook._id,
          event: input.event,
          payload: input.payload,
          status: "pending",
        });

        // Attempt inline; failures retry via cron.
        void deliverWebhook(hook._id.toString(), delivery._id.toString()).catch(
          (err) => {
            console.error("Webhook delivery failed:", err);
          },
        );
      }
    } catch (err) {
      console.error("Webhook dispatch failed:", err);
    }
  })();
}

/**
 * Retry job — attempts pending deliveries that failed previously.
 * Backs off with a simple count-based rule: retry 1 after 1m, retry 2
 * after 5m, retry 3 after 30m, retry 4 after 2h.
 */
export async function retryPendingDeliveries(max = 50) {
  const pending = await WebhookDelivery.find({ status: "pending" })
    .sort({ lastAttemptAt: 1, createdAt: 1 })
    .limit(max)
    .lean();

  const now = Date.now();
  const DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

  let retried = 0;
  for (const d of pending) {
    if (d.attempts === 0) continue; // Not yet attempted — skip inline-waiting items.
    const delay = DELAYS_MS[Math.min(d.attempts - 1, DELAYS_MS.length - 1)];
    const lastAttempt = d.lastAttemptAt?.getTime() ?? 0;
    if (now - lastAttempt < delay) continue;

    await deliverWebhook(d.webhookId.toString(), d._id.toString());
    retried += 1;
  }

  return { checked: pending.length, retried };
}
