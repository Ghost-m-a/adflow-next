import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { connectToDatabase } from "@/lib/db/mongodb";
import { getStripe } from "@/lib/stripe/client";
import WalletDeposit from "@/models/WalletDeposit";
import { confirmDeposit, failDeposit } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ provider: string }> };

/**
 * Handles payment-provider webhooks. Only Stripe is implemented —
 * add additional providers under the same route.
 */
export async function POST(request: NextRequest, ctx: Context) {
  const { provider } = await ctx.params;

  if (provider !== "stripe") {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 404 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Stripe webhook secret not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 401 });
  }

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  await connectToDatabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const depositId = session.metadata?.depositId;
        if (!depositId) {
          console.warn("Stripe session has no depositId:", session.id);
          break;
        }
        await confirmDeposit(depositId, session.id);
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const depositId = session.metadata?.depositId;
        if (depositId) {
          await failDeposit(depositId, `Stripe event: ${event.type}`);
        }
        break;
      }

      case "charge.refunded": {
        // Refund handled by admin — this is a placeholder for now.
        console.info("Charge refunded:", event.data.object);
        break;
      }

      default: {
        // Ignore unhandled event types.
        break;
      }
    }

    // Idempotency via WebhookEvent.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}

void WalletDeposit;
