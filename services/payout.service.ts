import { randomBytes } from "node:crypto";
import mongoose from "mongoose";

import Payout from "@/models/Payout";
import PayoutAccount from "@/models/PayoutAccount";
import { getPayoutProvider, minPayoutFor } from "@/lib/payments/provider";
import {
  getCreatorBalances,
  holdAvailableForPayout,
  releaseHeldEntries,
  markHeldEntriesPaid,
} from "@/services/ledger.service";
import { notifySafe } from "@/services/notification.service";

function generateReference(): string {
  return `PO-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export class PayoutError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PayoutError";
    this.statusCode = statusCode;
  }
}

/** Ask the provider to send, then persist the outcome. */
async function dispatchPayout(payoutId: string) {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new PayoutError("Payout not found.", 404);

  const provider = getPayoutProvider();

  let result;
  try {
    result = await provider.send({
      payoutId: payout._id.toString(),
      reference: payout.reference,
      amount: payout.amount,
      currency: payout.currency,
      accountLabel: payout.destinationSnapshot.label,
      accountDetails: payout.destinationSnapshot.details,
    });
  } catch (error) {
    result = {
      status: "failed" as const,
      failureReason:
        error instanceof Error ? error.message : "Provider request failed.",
    };
  }

  if (result.status === "failed") {
    payout.status = "failed";
    payout.failureReason = result.failureReason;
    payout.failedAt = new Date();
    await payout.save();
    await releaseHeldEntries(payout._id);

    notifySafe({
      userId: payout.userId,
      type: "payment",
      title: "Payout failed",
      message: `Your ${payout.currency} ${payout.amount.toFixed(2)} payout failed: ${result.failureReason}`,
      href: "/creator/payouts",
    });

    return payout;
  }

  if (result.status === "paid") {
    payout.status = "paid";
    payout.processedAt = new Date();
    payout.providerReference = result.providerReference;
    await payout.save();
    await markHeldEntriesPaid(payout._id);
    return payout;
  }

  payout.status = "processing";
  payout.providerReference = result.providerReference;
  await payout.save();
  return payout;
}

/** Creator requests a payout for their full available balance. */
export async function requestPayout(input: {
  userId: string;
  currency: string;
  accountId?: string;
}) {
  const userId = new mongoose.Types.ObjectId(input.userId);
  const currency = input.currency.toUpperCase();

  // No open payout for this currency (partial unique index also enforces this).
  const open = await Payout.findOne({
    userId,
    currency,
    status: { $in: ["requested", "processing"] },
  })
    .select("_id")
    .lean();

  if (open) {
    throw new PayoutError(
      "You already have an open payout for this currency. Wait for it to finish before requesting another.",
      409,
    );
  }

  // Determine destination account.
  const account = input.accountId
    ? await PayoutAccount.findOne({ _id: input.accountId, userId }).lean()
    : await PayoutAccount.findOne({ userId, currency, isDefault: true }).lean() ??
      await PayoutAccount.findOne({ userId, currency }).lean();

  if (!account) {
    throw new PayoutError(
      "Add a payout account for this currency before requesting a payout.",
      409,
    );
  }
  if (account.currency !== currency) {
    throw new PayoutError(
      `Account currency (${account.currency}) does not match payout currency (${currency}).`,
      400,
    );
  }

  // Verify available balance meets threshold.
  const balances = await getCreatorBalances(input.userId);
  const bucket = balances[currency];
  const available = bucket?.available ?? 0;

  const minimum = minPayoutFor(currency);
  if (available < minimum) {
    throw new PayoutError(
      `Available balance (${currency} ${available.toFixed(2)}) is below the minimum payout threshold (${currency} ${minimum}).`,
      409,
    );
  }

  // Create payout.
  const payout = await Payout.create({
    userId,
    amount: Number(available.toFixed(2)),
    currency,
    status: "requested",
    reference: generateReference(),
    provider: getPayoutProvider().name,
    destinationSnapshot: {
      label: account.label,
      details: detailsToObject(account.details),
    },
    requestedAt: new Date(),
  });

  // Move available entries to held for this payout.
  const held = await holdAvailableForPayout({
    userId,
    currency,
    payoutId: payout._id,
  });

  // Guard against a race that could leave us holding the wrong amount.
  if (Math.abs(held.total - payout.amount) > 0.01) {
    await releaseHeldEntries(payout._id);
    await Payout.findByIdAndDelete(payout._id);
    throw new PayoutError(
      "Balance changed while preparing the payout. Please try again.",
      409,
    );
  }

  payout.ledgerEntryIds = held.entryIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  await payout.save();

  // Kick off the provider call. Manual provider returns "processing".
  return dispatchPayout(payout._id.toString());
}

/** Admin marks a "processing" payout as paid (manual provider flow). */
export async function markPayoutPaid(
  payoutId: string,
  providerReference?: string,
) {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new PayoutError("Payout not found.", 404);

  if (payout.status !== "processing" && payout.status !== "requested") {
    throw new PayoutError(
      `Only requested or processing payouts can be marked paid (current: ${payout.status}).`,
      409,
    );
  }

  payout.status = "paid";
  payout.processedAt = new Date();
  if (providerReference) payout.providerReference = providerReference;
  await payout.save();

  await markHeldEntriesPaid(payout._id);

  notifySafe({
    userId: payout.userId,
    type: "payment",
    title: "Payout sent",
    message: `${payout.currency} ${payout.amount.toFixed(2)} was sent to ${payout.destinationSnapshot?.label ?? "your account"}.`,
    href: "/creator/payouts",
  });

  return payout;
}

/** Admin marks a payout failed, or creator cancels while still requested. */
export async function failPayout(payoutId: string, reason: string) {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new PayoutError("Payout not found.", 404);

  if (!["requested", "processing"].includes(payout.status)) {
    throw new PayoutError(
      `Cannot fail a ${payout.status} payout.`,
      409,
    );
  }

  payout.status = "failed";
  payout.failedAt = new Date();
  payout.failureReason = reason.slice(0, 500);
  await payout.save();

  await releaseHeldEntries(payout._id);
  return payout;
}

/** Creator cancels their own request. Only allowed while "requested". */
export async function cancelPayout(payoutId: string, userId: string) {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new PayoutError("Payout not found.", 404);

  if (payout.userId.toString() !== userId) {
    throw new PayoutError("You can only cancel your own payouts.", 403);
  }

  if (payout.status !== "requested") {
    throw new PayoutError(
      `Cannot cancel a ${payout.status} payout. Contact support if you need help.`,
      409,
    );
  }

  payout.status = "cancelled";
  payout.cancelledAt = new Date();
  await payout.save();

  await releaseHeldEntries(payout._id);
  return payout;
}


function detailsToObject(details: unknown): Record<string, string> {
  if (details instanceof Map) {
    return Object.fromEntries(details as Map<string, string>);
  }
  if (details && typeof details === "object") {
    return details as Record<string, string>;
  }
  return {};
}
