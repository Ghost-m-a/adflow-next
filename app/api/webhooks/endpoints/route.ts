import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import Webhook, { WEBHOOK_EVENTS, type WebhookEventName } from "@/models/Webhook";

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

    const endpoints = await Webhook.find({ organizationId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      endpoints: endpoints.map((w) => ({
        _id: w._id.toString(),
        name: w.name,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
        lastDeliveryAt: w.lastDeliveryAt ?? null,
        lastFailureAt: w.lastFailureAt ?? null,
        consecutiveFailures: w.consecutiveFailures,
        createdAt: w.createdAt,
      })),
      availableEvents: WEBHOOK_EVENTS,
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
    const name = b.name;
    const url = b.url;
    const events = b.events;

    if (typeof organizationId !== "string") {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "name required." }, { status: 400 });
    }
    if (typeof url !== "string" || !/^https:\/\/\S+$/i.test(url)) {
      return NextResponse.json(
        { error: "url must be a valid HTTPS URL." },
        { status: 400 },
      );
    }
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "At least one event is required." },
        { status: 400 },
      );
    }
    const invalid = events.filter(
      (e) => !WEBHOOK_EVENTS.includes(e as never),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);

    const secret = `whsec_${randomBytes(24).toString("hex")}`;

    const created = await Webhook.create({
      organizationId,
      createdBy: session.userId,
      name: name.trim(),
      url,
      secret,
      events: events as WebhookEventName[],
      isActive: true,
    });

    return NextResponse.json(
      {
        endpoint: {
          _id: created._id.toString(),
          name: created.name,
          url: created.url,
          events: created.events,
          secret, // Shown once.
          isActive: created.isActive,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}
