import mongoose from "mongoose";

import LedgerEntry from "@/models/LedgerEntry";
import WalletDeposit from "@/models/WalletDeposit";
import Campaign from "@/models/Campaign";
import { getBillingProvider } from "@/lib/payments/billing-provider";

export class WalletError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "WalletError";
    this.statusCode = statusCode;
  }
}

/** Aggregated wallet balance for an organization, grouped by currency. */
export async function getOrganizationBalances(organizationId: string) {
  const oid = new mongoose.Types.ObjectId(organizationId);

  const rows = await LedgerEntry.aggregate<{
    _id: { currency: string; status: string; type: string };
    total: number;
  }>([
    { $match: { organizationId: oid } },
    {
      $group: {
        _id: { currency: "$currency", status: "$status", type: "$type" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const result: Record<
    string,
    {
      deposited: number;
      spent: number;
      pending: number;
      refunded: number;
    }
  > = {};

  for (const row of rows) {
    const { currency, status, type } = row._id;
    if (!result[currency]) {
      result[currency] = { deposited: 0, spent: 0, pending: 0, refunded: 0 };
    }

    // Only "credit" entries scoped to org (deposits) count as funding.
    if (type === "credit" && status === "available") {
      result[currency].deposited += row.total;
    }
    // Advertiser debits for approved conversions count as spend.
    if (type === "debit" && status === "available") {
      result[currency].spent += row.total;
    }
    // Pending advertiser debits.
    if (type === "debit" && status === "pending") {
      result[currency].pending += row.total;
    }
    // Reversal / void entries adjust back.
    if (type === "reversal" && status === "available") {
      result[currency].refunded += row.total;
    }
  }

  const withAvailable: Record<string, typeof result[string] & { available: number }> = {};
  for (const [currency, b] of Object.entries(result)) {
    withAvailable[currency] = {
      ...b,
      available: Number(
        (b.deposited - b.spent - b.pending + b.refunded).toFixed(2),
      ),
    };
  }
  return withAvailable;
}

/** Sum of budget committed to active campaigns, per currency. */
export async function getBudgetCommitments(organizationId: string) {
  const oid = new mongoose.Types.ObjectId(organizationId);

  const rows = await Campaign.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        organizationId: oid,
        status: { $in: ["active", "paused"] },
      },
    },
    {
      $group: {
        _id: "$currency",
        total: { $sum: "$budget" },
      },
    },
  ]);

  return Object.fromEntries(rows.map((r) => [r._id, Number(r.total.toFixed(2))]));
}

/** Guardrail — check the org has headroom for a new campaign budget. */
export async function ensureBudgetHeadroom(input: {
  organizationId: string;
  currency: string;
  additionalBudget: number;
}) {
  const [balances, committed] = await Promise.all([
    getOrganizationBalances(input.organizationId),
    getBudgetCommitments(input.organizationId),
  ]);

  const available = balances[input.currency]?.available ?? 0;
  const already = committed[input.currency] ?? 0;
  const headroom = available - already;

  if (headroom < input.additionalBudget) {
    throw new WalletError(
      `Insufficient wallet balance. Available: ${input.currency} ${available.toFixed(2)}, committed to active campaigns: ${input.currency} ${already.toFixed(2)}. Top up to fund this budget.`,
      409,
    );
  }
}

/* ------------------------------------------------------------------
   Deposits
------------------------------------------------------------------ */

export async function createDeposit(input: {
  organizationId: string;
  organizationName: string;
  userId: string;
  amount: number;
  currency: string;
  appOrigin: string;
}) {
  if (!Number.isFinite(input.amount) || input.amount < 1) {
    throw new WalletError("Minimum deposit is 1.", 400);
  }
  const provider = getBillingProvider();

  const deposit = await WalletDeposit.create({
    organizationId: new mongoose.Types.ObjectId(input.organizationId),
    initiatedBy: new mongoose.Types.ObjectId(input.userId),
    amount: Number(input.amount.toFixed(2)),
    currency: input.currency.toUpperCase(),
    status: "pending",
    provider: provider.name,
  });

  const successUrl = `${input.appOrigin}/advertiser/wallet?deposit=${deposit._id.toString()}&status=success`;
  const cancelUrl = `${input.appOrigin}/advertiser/wallet?deposit=${deposit._id.toString()}&status=cancelled`;

  const session = await provider.createCheckout({
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    amount: deposit.amount,
    currency: deposit.currency,
    successUrl,
    cancelUrl,
    metadata: { depositId: deposit._id.toString() },
  });

  deposit.providerSessionId = session.sessionId;
  deposit.providerReference = session.providerReference;
  deposit.checkoutUrl = session.checkoutUrl || undefined;
  await deposit.save();

  return deposit;
}

/** Confirm a deposit and credit the organization's ledger. Idempotent. */
export async function confirmDeposit(depositId: string, providerReference?: string) {
  if (!mongoose.isValidObjectId(depositId)) {
    throw new WalletError("Invalid deposit.", 400);
  }

  const deposit = await WalletDeposit.findById(depositId);
  if (!deposit) throw new WalletError("Deposit not found.", 404);

  if (deposit.status === "succeeded") {
    return deposit;
  }
  if (deposit.status === "failed" || deposit.status === "cancelled") {
    throw new WalletError(`Deposit is already ${deposit.status}.`, 409);
  }

  // Credit the wallet.
  const [credit] = await LedgerEntry.create([
    {
      organizationId: deposit.organizationId,
      type: "credit",
      status: "available",
      amount: deposit.amount,
      currency: deposit.currency,
      reference: `deposit:${deposit._id.toString()}`,
      description: "Wallet top-up",
      availableAt: new Date(),
      metadata: { depositId: deposit._id.toString() },
    },
  ]);

  deposit.status = "succeeded";
  deposit.ledgerEntryId = credit._id;
  deposit.completedAt = new Date();
  if (providerReference) deposit.providerReference = providerReference;
  await deposit.save();

  return deposit;
}

export async function failDeposit(depositId: string, reason: string) {
  const deposit = await WalletDeposit.findById(depositId);
  if (!deposit) throw new WalletError("Deposit not found.", 404);
  if (deposit.status !== "pending") return deposit;

  deposit.status = "failed";
  deposit.failureReason = reason.slice(0, 500);
  await deposit.save();
  return deposit;
}

export async function cancelDeposit(depositId: string) {
  const deposit = await WalletDeposit.findById(depositId);
  if (!deposit) throw new WalletError("Deposit not found.", 404);
  if (deposit.status !== "pending") return deposit;

  deposit.status = "cancelled";
  await deposit.save();
  return deposit;
}

/* ------------------------------------------------------------------
   Platform fee
------------------------------------------------------------------ */

/**
 * Split a conversion amount into a creator credit and platform fee.
 * Called from the conversion service when a conversion is approved.
 */
export function splitPlatformFee(
  amount: number,
  feePct: number,
): { creatorAmount: number; platformFee: number } {
  const creatorAmount = Number((amount * (1 - feePct / 100)).toFixed(2));
  const platformFee = Number((amount - creatorAmount).toFixed(2));
  return { creatorAmount, platformFee };
}
