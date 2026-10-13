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
import { StripeBillingProvider } from "./stripe-billing-provider";

export function getBillingProvider(): BillingProvider {
  const name = (process.env.BILLING_PROVIDER || "mock").toLowerCase();
  if (name === "stripe") return new StripeBillingProvider();
  if (name === "manual") return new ManualProvider();
  return new MockProvider();
}

export function platformFeePct(): number {
  const raw = process.env.PLATFORM_FEE_PCT;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 50);
}
