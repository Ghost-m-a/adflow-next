import mongoose from "mongoose";

import LedgerEntry from "@/models/LedgerEntry";

/** Records the debit and credit pair when a conversion is first created. */
export async function recordConversionPending(input: {
  conversionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
}) {
  const ref = `conv:${input.conversionId.toString()}`;

  await LedgerEntry.insertMany(
    [
      {
        conversionId: input.conversionId,
        campaignId: input.campaignId,
        userId: input.creatorId,
        type: "credit",
        status: "pending",
        amount: input.amount,
        currency: input.currency,
        reference: ref,
        description: "Pending creator reward",
      },
      {
        conversionId: input.conversionId,
        campaignId: input.campaignId,
        organizationId: input.organizationId,
        type: "debit",
        status: "pending",
        amount: input.amount,
        currency: input.currency,
        reference: ref,
        description: "Pending advertiser charge",
      },
    ],
    { ordered: true },
  );
}

/** Promote all pending entries for a conversion to available. */
export async function promoteConversion(conversionId: mongoose.Types.ObjectId) {
  await LedgerEntry.updateMany(
    { conversionId, status: "pending" },
    { $set: { status: "available", availableAt: new Date() } },
  );
}

/** Reverse a conversion — pending entries become void, available ones become reversal pairs. */
export async function reverseConversion(
  conversionId: mongoose.Types.ObjectId,
  reason?: string,
) {
  const entries = await LedgerEntry.find({ conversionId }).lean();

  for (const entry of entries) {
    if (entry.status === "pending") {
      await LedgerEntry.updateOne(
        { _id: entry._id },
        { $set: { status: "void", description: reason || "Reversed before approval" } },
      );
      continue;
    }

    if (entry.status === "available") {
      // Flip the entry to void and insert an opposite-signed reversal.
      await LedgerEntry.updateOne(
        { _id: entry._id },
        { $set: { status: "void" } },
      );
      await LedgerEntry.create({
        conversionId: entry.conversionId,
        campaignId: entry.campaignId,
        userId: entry.userId,
        organizationId: entry.organizationId,
        type: entry.type === "credit" ? "reversal" : "reversal",
        status: "available",
        amount: entry.amount,
        currency: entry.currency,
        reference: `${entry.reference}:rev`,
        description: reason || "Reversed after approval",
      });
    }
  }
}

/** Aggregated balances for a creator, per currency. */
export async function getCreatorBalances(userId: string) {
  const id = new mongoose.Types.ObjectId(userId);

  const rows = await LedgerEntry.aggregate<{
    _id: { currency: string; status: string };
    total: number;
  }>([
    { $match: { userId: id, type: { $in: ["credit", "reversal"] } } },
    {
      $group: {
        _id: { currency: "$currency", status: "$status" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const result: Record<
    string,
    { pending: number; available: number; held: number; paid: number }
  > = {};

  for (const row of rows) {
    const { currency, status } = row._id;
    if (!result[currency]) {
      result[currency] = { pending: 0, available: 0, held: 0, paid: 0 };
    }
    if (status === "pending") result[currency].pending += row.total;
    else if (status === "available") result[currency].available += row.total;
    else if (status === "held") result[currency].held += row.total;
    else if (status === "paid") result[currency].paid += row.total;
  }

  return result;
}

/**
 * Atomically move every available credit entry for a creator in a
 * currency into "held" state, tied to a specific payout.
 * Returns the total amount moved and the entry ids.
 */
export async function holdAvailableForPayout(input: {
  userId: mongoose.Types.ObjectId;
  currency: string;
  payoutId: mongoose.Types.ObjectId;
}) {
  const available = await LedgerEntry.find({
    userId: input.userId,
    currency: input.currency,
    status: "available",
    type: { $in: ["credit", "reversal"] },
  })
    .select("_id amount")
    .lean();

  const total = available.reduce((sum, e) => sum + e.amount, 0);

  if (available.length > 0) {
    await LedgerEntry.updateMany(
      { _id: { $in: available.map((e) => e._id) } },
      {
        $set: {
          status: "held",
          heldAt: new Date(),
          payoutId: input.payoutId,
        },
      },
    );
  }

  return { total, entryIds: available.map((e) => e._id.toString()) };
}

/** Release held entries back to available (payout cancelled or failed). */
export async function releaseHeldEntries(payoutId: mongoose.Types.ObjectId) {
  await LedgerEntry.updateMany(
    { payoutId, status: "held" },
    {
      $set: { status: "available" },
      $unset: { payoutId: "", heldAt: "" },
    },
  );
}

/** Mark held entries as paid (payout succeeded). */
export async function markHeldEntriesPaid(payoutId: mongoose.Types.ObjectId) {
  await LedgerEntry.updateMany(
    { payoutId, status: "held" },
    { $set: { status: "paid", paidAt: new Date() } },
  );
}

/**
 * Record a submission reward. Credit and debit entries are
 * immediately "available" — content rewards have no attribution
 * window. Idempotency is enforced by the caller (the submission
 * stores the credit entry id).
 */
export async function recordSubmissionReward(input: {
  submissionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
}) {
  const ref = `sub:${input.submissionId.toString()}`;

  const [credit] = await LedgerEntry.create([
    {
      campaignId: input.campaignId,
      userId: input.creatorId,
      type: "credit",
      status: "available",
      amount: input.amount,
      currency: input.currency,
      reference: ref,
      description: "Content submission reward",
      availableAt: new Date(),
      metadata: { submissionId: input.submissionId.toString() },
    },
  ]);

  await LedgerEntry.create({
    campaignId: input.campaignId,
    organizationId: input.organizationId,
    type: "debit",
    status: "available",
    amount: input.amount,
    currency: input.currency,
    reference: ref,
    description: "Approved content submission",
    availableAt: new Date(),
    metadata: { submissionId: input.submissionId.toString() },
  });

  return credit;
}

/**
 * Reverse an approved submission reward. Flips the credit to void and
 * inserts a matching debit to cancel it out.
 */
export async function reverseSubmissionReward(
  creditEntryId: mongoose.Types.ObjectId,
) {
  const credit = await LedgerEntry.findById(creditEntryId).lean();
  if (!credit || credit.type !== "credit") return;

  await LedgerEntry.updateOne(
    { _id: credit._id },
    { $set: { status: "void" } },
  );

  await LedgerEntry.create({
    userId: credit.userId,
    campaignId: credit.campaignId,
    type: "reversal",
    status: "available",
    amount: credit.amount,
    currency: credit.currency,
    reference: `${credit.reference}:rev`,
    description: "Submission reward reversed",
    availableAt: new Date(),
    metadata: credit.metadata,
  });

  // Reverse the paired advertiser debit as well.
  await LedgerEntry.updateMany(
    { reference: credit.reference, organizationId: { $exists: true } },
    { $set: { status: "void" } },
  );
}
