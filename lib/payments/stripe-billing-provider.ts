import type { BillingProvider, CheckoutSession } from "./provider";
import { getStripe } from "@/lib/stripe/client";

/**
 * Real Stripe Checkout integration. Creates a one-time payment session
 * for a wallet deposit. Webhook confirms the deposit and credits the
 * ledger.
 */
export class StripeBillingProvider implements BillingProvider {
  name = "stripe";

  async createCheckout(input: {
    organizationId: string;
    organizationName: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession> {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: Math.round(input.amount * 100),
            product_data: {
              name: `Wallet top-up — ${input.organizationName}`,
              description: "Funds added to your ADFLOW wallet, usable for campaign budgets.",
            },
          },
          quantity: 1,
        },
      ],
      // Preserve attribution in metadata.
      metadata: {
        organizationId: input.organizationId,
        ...(input.metadata ?? {}),
      },
      // Auto-capture every field Stripe already has, and let the user
      // edit them on the Checkout page if needed.
      billing_address_collection: "auto",
      // Idempotency: reuse a session if we retry within Stripe's window.
      payment_intent_data: {
        metadata: {
          organizationId: input.organizationId,
          ...(input.metadata ?? {}),
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      providerReference: session.id,
    };
  }
}
