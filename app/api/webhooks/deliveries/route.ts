import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import Webhook from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";
import { deliverWebhook } from "@/services/webhook-dispatcher.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const organizationId = req.nextUrl.searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }
    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    const hooks = await Webhook.find({ organizationId })
      .select("_id name")
      .lean();
    const hookIds = hooks.map((h) => h._id);
    const hookMap = new Map(hooks.map((h) => [h._id.toString(), h.name]));

    const deliveries = await WebhookDelivery.find({
      webhookId: { $in: hookIds },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      deliveries: deliveries.map((d) => ({
        _id: d._id.toString(),
        webhookId: d.webhookId.toString(),
        webhookName: hookMap.get(d.webhookId.toString()) ?? "Webhook",
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        lastAttemptAt: d.lastAttemptAt ?? null,
        responseStatus: d.responseStatus ?? null,
        responseBody: d.responseBody ?? null,
        error: d.error ?? null,
        deliveredAt: d.deliveredAt ?? null,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}

/** Manually retry a delivery. */
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json().catch(() => null);
    const b = body as { deliveryId?: string; organizationId?: string } | null;
    if (!b?.deliveryId || !b.organizationId) {
      return NextResponse.json(
        { error: "deliveryId and organizationId required." },
        { status: 400 },
      );
    }

    await requireOrganizationRole(b.organizationId, ["owner", "admin"]);
    await connectToDatabase();

    if (!mongoose.isValidObjectId(b.deliveryId)) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const delivery = await WebhookDelivery.findById(b.deliveryId).lean();
    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }

    // Reset attempts so the dispatcher treats it as fresh.
    await WebhookDelivery.updateOne(
      { _id: delivery._id },
      {
        $set: {
          status: "pending",
          attempts: 0,
          error: undefined,
          responseBody: undefined,
        },
      },
    );

    await deliverWebhook(
      delivery.webhookId.toString(),
      delivery._id.toString(),
    );

    const updated = await WebhookDelivery.findById(delivery._id).lean();

    return NextResponse.json({
      delivery: {
        _id: updated!._id.toString(),
        status: updated!.status,
        attempts: updated!.attempts,
        responseStatus: updated!.responseStatus ?? null,
      },
    });
  } catch (error) {
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to retry." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}
