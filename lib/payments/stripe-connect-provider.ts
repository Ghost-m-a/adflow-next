import type {
  PayoutProvider,
  PayoutProviderResult,
} from "./provider";
import { getStripe } from "@/lib/stripe/client";

/**
 * Stripe Connect Express for creator payouts.
 *
 * Flow:
 *   1. Creator completes Stripe-hosted onboarding (KYC, bank, identity).
 *   2. When they request a payout, we create a Stripe Transfer to their
 *      connected account.
 *   3. The creator's bank receives the funds per Stripe's schedule.
 */
export class StripeConnectProvider implements PayoutProvider {
  name = "stripe_connect";

  async send(input: {
    payoutId: string;
    reference: string;
    amount: number;
    currency: string;
    accountLabel: string;
    accountDetails: Record<string, string>;
  }): Promise<PayoutProviderResult> {
    const connectedAccountId = input.accountDetails.stripeAccountId;
    if (!connectedAccountId) {
      return {
        status: "failed",
        failureReason:
          "Missing Stripe connected account. Complete onboarding first.",
      };
    }

    const stripe = getStripe();

    // Verify the account is able to receive transfers before we try.
    try {
      const account = await stripe.accounts.retrieve(connectedAccountId);

      if (!account.payouts_enabled) {
        return {
          status: "failed",
          failureReason:
            "Stripe account is not yet ready to receive payouts. Finish onboarding.",
        };
      }
    } catch (err) {
      return {
        status: "failed",
        failureReason:
          err instanceof Error
            ? `Stripe account lookup failed: ${err.message}`
            : "Stripe account lookup failed.",
      };
    }

    // Create the transfer.
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(input.amount * 100),
          currency: input.currency.toLowerCase(),
          destination: connectedAccountId,
          transfer_group: input.reference,
          metadata: {
            payoutId: input.payoutId,
            reference: input.reference,
          },
        },
        {
          // Idempotency — retrying the same payout won't double-transfer.
          idempotencyKey: `payout_${input.payoutId}`,
        },
      );

      return {
        status: "processing",
        providerReference: transfer.id,
      };
    } catch (err) {
      return {
        status: "failed",
        failureReason:
          err instanceof Error
            ? `Stripe transfer failed: ${err.message}`
            : "Stripe transfer failed.",
      };
    }
  }
}
