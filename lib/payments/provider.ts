export type PayoutProviderResult =
  | { status: "processing"; providerReference: string }
  | { status: "paid"; providerReference: string }
  | { status: "failed"; failureReason: string };

export interface PayoutProvider {
  name: string;
  /** Attempt to send the payout. May be async and return "processing". */
  send(input: {
    payoutId: string;
    reference: string;
    amount: number;
    currency: string;
    accountLabel: string;
    accountDetails: Record<string, string>;
  }): Promise<PayoutProviderResult>;
}

class ManualProvider implements PayoutProvider {
  name = "manual";
  async send(): Promise<PayoutProviderResult> {
    // Manual = admin will mark paid out of band. Report "processing".
    return { status: "processing", providerReference: "" };
  }
}

class StripeProvider implements PayoutProvider {
  name = "stripe";
  async send(): Promise<PayoutProviderResult> {
    // Real integration deferred. Guard the shape so the service still
    // works if the key is missing.
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: "failed",
        failureReason: "Stripe is not configured (missing STRIPE_SECRET_KEY).",
      };
    }
    return {
      status: "failed",
      failureReason: "Stripe Connect payouts are not yet implemented.",
    };
  }
}

import { StripeConnectProvider } from "./stripe-connect-provider";

export function getPayoutProvider(): PayoutProvider {
  const name = (process.env.PAYOUT_PROVIDER || "manual").toLowerCase();
  if (name === "stripe") return new StripeConnectProvider();
  return new ManualProvider();
}

export function minPayoutFor(currency: string): number {
  const key = `PAYOUT_MIN_${currency.toUpperCase()}`;
  const raw = process.env[key];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}
