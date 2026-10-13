import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import Webhook from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ webhookId: string }> },
) {
  try {
    await requireSession();
    const { webhookId } = await ctx.params;
    if (!mongoose.isValidObjectId(webhookId)) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const organizationId = (body as { organizationId?: string } | null)?.organizationId;
    if (typeof organizationId !== "string") {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    const hook = await Webhook.findOne({
      _id: webhookId,
      organizationId,
    });
    if (!hook) {
      return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }

    const b = body as Record<string, unknown>;
    if (typeof b.isActive === "boolean") hook.isActive = b.isActive;
    if (typeof b.name === "string" && b.name.trim()) hook.name = b.name.trim();
    if (typeof b.url === "string" && /^https:\/\/\S+$/i.test(b.url)) {
      hook.url = b.url;
    }

    await hook.save();

    return NextResponse.json({
      endpoint: {
        _id: hook._id.toString(),
        isActive: hook.isActive,
        name: hook.name,
        url: hook.url,
      },
    });
  } catch (error) {
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ webhookId: string }> },
) {
  try {
    await requireSession();
    const { webhookId } = await ctx.params;
    const organizationId = req.nextUrl.searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    const removed = await Webhook.findOneAndDelete({
      _id: webhookId,
      organizationId,
    });
    if (!removed) {
      return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }

    await WebhookDelivery.deleteMany({ webhookId: removed._id });

    return NextResponse.json({ success: true });
  } catch (error) {
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}
