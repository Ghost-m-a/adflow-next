import { randomBytes } from "node:crypto";

export type CheckoutSession = {
  sessionId: string;
  checkoutUrl: string;
  providerReference?: string;
};

export interface BillingProvider {
  name: string;
  createCheckout(input: {
    organizationId: string;
    organizationName: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession>;
}

/** For development — instantly successful, no external provider. */
class MockProvider implements BillingProvider {
  name = "mock";

  async createCheckout(input: {
    amount: number;
    currency: string;
    successUrl: string;
  }): Promise<CheckoutSession> {
    const sessionId = `mock_${randomBytes(8).toString("hex")}`;
    return {
      sessionId,
      // Redirects back to the app, where the mock endpoint will confirm.
      checkoutUrl: `${input.successUrl}?mock_session=${sessionId}`,
      providerReference: sessionId,
    };
  }
}

/** Manual — creates a "pending" deposit that an admin marks succeeded. */
class ManualProvider implements BillingProvider {
  name = "manual";

  async createCheckout(): Promise<CheckoutSession> {
    const sessionId = `manual_${randomBytes(8).toString("hex")}`;
    return {
      sessionId,
      checkoutUrl: "",
      providerReference: sessionId,
    };
  }
}

/**
 * Stripe via raw REST API. Only used when BILLING_PROVIDER=stripe
 * and STRIPE_SECRET_KEY is set.
 */
class StripeProvider implements BillingProvider {
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
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", input.successUrl);
    body.set("cancel_url", input.cancelUrl);
    body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(Math.round(input.amount * 100)));
    body.set("line_items[0][price_data][product_data][name]", `Wallet top-up — ${input.organizationName}`);
    body.set("line_items[0][quantity]", "1");
    body.set("metadata[organizationId]", input.organizationId);
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) {
        body.set(`metadata[${k}]`, v);
      }
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = (await res.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };

    if (!res.ok || !data.id || !data.url) {
      throw new Error(data.error?.message ?? "Stripe checkout failed.");
    }

    return {
      sessionId: data.id,
      checkoutUrl: data.url,
      providerReference: data.id,
    };
  }
}

export function getBillingProvider(): BillingProvider {
  const name = (process.env.BILLING_PROVIDER || "mock").toLowerCase();
  if (name === "stripe") return new StripeProvider();
  if (name === "manual") return new ManualProvider();
  return new MockProvider();
}

export function platformFeePct(): number {
  const raw = process.env.PLATFORM_FEE_PCT;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 50);
}
