import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { confirmDeposit, failDeposit } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ provider: string }> };

export async function POST(request: NextRequest, ctx: Context) {
  const { provider } = await ctx.params;

  if (provider !== "stripe") {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 404 });
  }

  const raw = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 401 });
  }

  // Simplified Stripe signature verification.
  // Format: t=<timestamp>,v1=<signature>
  const parts = Object.fromEntries(
    signature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );
  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${raw}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1 ?? "", "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  await connectToDatabase();

  const session = body.data?.object;
  const depositId =
    typeof session?.metadata === "object" && session.metadata
      ? (session.metadata as Record<string, string>).depositId
      : undefined;

  if (!depositId || !mongoose.isValidObjectId(depositId)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const providerReference =
    typeof session?.id === "string" ? session.id : undefined;

  try {
    if (body.type === "checkout.session.completed") {
      await confirmDeposit(depositId, providerReference);
    } else if (
      body.type === "checkout.session.expired" ||
      body.type === "checkout.session.async_payment_failed"
    ) {
      await failDeposit(depositId, `Stripe event: ${body.type}`);
    }
  } catch (err) {
    console.error("Deposit webhook failed:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
