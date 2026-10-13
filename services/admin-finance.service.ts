import mongoose from "mongoose";

import LedgerEntry from "@/models/LedgerEntry";
import WalletDeposit from "@/models/WalletDeposit";
import Conversion from "@/models/Conversion";
import Organization from "@/models/Organization";
import User from "@/models/User";
import Payout from "@/models/Payout";

export type PlatformOverview = {
  totals: {
    depositsAllTime: Record<string, number>;
    platformFeesAllTime: Record<string, number>;
    approvedSpendAllTime: Record<string, number>;
    pendingPayoutsByCurrency: Array<{ currency: string; amount: number; count: number }>;
    totalOrganizations: number;
    totalCreators: number;
  };
  last30d: {
    deposits: Record<string, number>;
    platformFees: Record<string, number>;
    approvedSpend: Record<string, number>;
    refunds: Record<string, number>;
  };
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    depositsAllAgg,
    feesAllAgg,
    approvedSpendAllAgg,
    deposits30Agg,
    fees30Agg,
    approvedSpend30Agg,
    refunds30Agg,
    pendingPayoutsAgg,
    totalOrganizations,
    totalCreators,
  ] = await Promise.all([
    LedgerEntry.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          type: "credit",
          status: "available",
          reference: { $regex: /^deposit:/ },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          type: "fee",
          status: { $in: ["available", "paid"] },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          type: "debit",
          status: { $in: ["available", "paid"] },
          reference: { $regex: /^conv:/ },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          type: "credit",
          status: "available",
          reference: { $regex: /^deposit:/ },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          type: "fee",
          status: { $in: ["available", "paid"] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          type: "debit",
          status: { $in: ["available", "paid"] },
          reference: { $regex: /^conv:/ },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          type: "reversal",
          status: "available",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ]),
    Payout.aggregate<{ _id: string; total: number; count: number }>([
      { $match: { status: { $in: ["requested", "processing"] } } },
      {
        $group: {
          _id: "$currency",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Organization.countDocuments({ isSuspended: false }),
    User.countDocuments({ isActive: true }),
  ]);

  function toMap(agg: { _id: string; total: number }[]): Record<string, number> {
    return Object.fromEntries(agg.map((r) => [r._id, Number(r.total.toFixed(2))]));
  }

  return {
    totals: {
      depositsAllTime: toMap(depositsAllAgg),
      platformFeesAllTime: toMap(feesAllAgg),
      approvedSpendAllTime: toMap(approvedSpendAllAgg),
      pendingPayoutsByCurrency: pendingPayoutsAgg.map((r) => ({
        currency: r._id,
        amount: Number(r.total.toFixed(2)),
        count: r.count,
      })),
      totalOrganizations,
      totalCreators,
    },
    last30d: {
      deposits: toMap(deposits30Agg),
      platformFees: toMap(fees30Agg),
      approvedSpend: toMap(approvedSpend30Agg),
      refunds: toMap(refunds30Agg),
    },
  };
}

/* ============================================================
   Deposits
============================================================ */

export async function listDeposits(input: {
  status?: string;
  limit?: number;
}) {
  const filter: Record<string, unknown> = {};
  if (input.status && input.status !== "all") filter.status = input.status;

  const deposits = await WalletDeposit.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(input.limit ?? 100, 300))
    .populate({ path: "organizationId", select: "_id name slug" })
    .populate({ path: "initiatedBy", select: "_id username email name" })
    .lean();

  return deposits.map((d) => {
    const org = d.organizationId as unknown as {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      slug?: string;
    } | null;
    const user = d.initiatedBy as unknown as {
      _id?: mongoose.Types.ObjectId;
      username?: string;
      email?: string;
      name?: string;
    } | null;

    return {
      _id: d._id.toString(),
      organization: org
        ? {
            _id: org._id?.toString() ?? "",
            name: org.name ?? "",
            slug: org.slug ?? "",
          }
        : null,
      initiatedBy: user
        ? {
            _id: user._id?.toString() ?? "",
            username: user.username ?? "",
            email: user.email ?? "",
            name: user.name ?? "",
          }
        : null,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      provider: d.provider,
      providerReference: d.providerReference ?? null,
      failureReason: d.failureReason ?? null,
      createdAt: d.createdAt,
      completedAt: d.completedAt ?? null,
    };
  });
}

/* ============================================================
   Ledger
============================================================ */

export async function listLedger(input: {
  type?: string;
  status?: string;
  currency?: string;
  reference?: string;
  limit?: number;
}) {
  const filter: Record<string, unknown> = {};
  if (input.type && input.type !== "all") filter.type = input.type;
  if (input.status && input.status !== "all") filter.status = input.status;
  if (input.currency && input.currency !== "all") {
    filter.currency = input.currency.toUpperCase();
  }
  if (input.reference) {
    filter.reference = new RegExp(
      input.reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  }

  const entries = await LedgerEntry.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(input.limit ?? 200, 500))
    .populate({ path: "userId", select: "_id username email name" })
    .populate({ path: "organizationId", select: "_id name slug" })
    .lean();

  return entries.map((e) => {
    const user = e.userId as unknown as {
      _id?: mongoose.Types.ObjectId;
      username?: string;
      email?: string;
      name?: string;
    } | null;
    const org = e.organizationId as unknown as {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      slug?: string;
    } | null;

    return {
      _id: e._id.toString(),
      type: e.type,
      status: e.status,
      amount: e.amount,
      currency: e.currency,
      reference: e.reference,
      description: e.description ?? "",
      createdAt: e.createdAt,
      user: user
        ? {
            _id: user._id?.toString() ?? "",
            username: user.username ?? "",
            email: user.email ?? "",
            name: user.name ?? "",
          }
        : null,
      organization: org
        ? {
            _id: org._id?.toString() ?? "",
            name: org.name ?? "",
            slug: org.slug ?? "",
          }
        : null,
    };
  });
}

/* ============================================================
   Organization balances
============================================================ */

export type OrgFinanceRow = {
  _id: string;
  name: string;
  slug: string;
  balances: Array<{
    currency: string;
    deposited: number;
    spent: number;
    fees: number;
    available: number;
  }>;
  activeCampaignsBudget: Array<{ currency: string; amount: number }>;
};

export async function listOrganizationFinances(): Promise<OrgFinanceRow[]> {
  const orgs = await Organization.find()
    .select("_id name slug")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o._id);

  // Aggregate org ledger by currency and type.
  const rows = await LedgerEntry.aggregate<{
    _id: { orgId: mongoose.Types.ObjectId; currency: string; type: string; status: string };
    total: number;
  }>([
    { $match: { organizationId: { $in: orgIds } } },
    {
      $group: {
        _id: {
          orgId: "$organizationId",
          currency: "$currency",
          type: "$type",
          status: "$status",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Aggregate active campaign budget per org by currency.
  const budgetRows = await LedgerEntry.db
    .collection("campaigns")
    .aggregate<{ _id: { orgId: mongoose.Types.ObjectId; currency: string }; total: number }>([
      {
        $match: {
          organizationId: { $in: orgIds },
          status: { $in: ["active", "paused"] },
        },
      },
      {
        $group: {
          _id: { orgId: "$organizationId", currency: "$currency" },
          total: { $sum: "$budget" },
        },
      },
    ])
    .toArray();

  const balanceMap = new Map<
    string,
    Record<
      string,
      { deposited: number; spent: number; fees: number; available: number }
    >
  >();

  for (const row of rows) {
    const { orgId, currency, type, status } = row._id;
    const key = orgId.toString();
    if (!balanceMap.has(key)) balanceMap.set(key, {});
    const currencyMap = balanceMap.get(key)!;

    if (!currencyMap[currency]) {
      currencyMap[currency] = { deposited: 0, spent: 0, fees: 0, available: 0 };
    }

    const bucket = currencyMap[currency];

    if (type === "credit" && status === "available") bucket.deposited += row.total;
    if (type === "debit" && (status === "available" || status === "paid")) bucket.spent += row.total;
    if (type === "fee" && (status === "available" || status === "paid")) bucket.fees += row.total;
  }

  // Compute available = deposited - spent - fees (rounded).
  for (const currencyMap of balanceMap.values()) {
    for (const currency of Object.keys(currencyMap)) {
      const b = currencyMap[currency];
      b.deposited = Number(b.deposited.toFixed(2));
      b.spent = Number(b.spent.toFixed(2));
      b.fees = Number(b.fees.toFixed(2));
      b.available = Number((b.deposited - b.spent).toFixed(2));
    }
  }

  const budgetMap = new Map<string, Array<{ currency: string; amount: number }>>();
  for (const row of budgetRows) {
    const key = row._id.orgId.toString();
    if (!budgetMap.has(key)) budgetMap.set(key, []);
    budgetMap.get(key)!.push({
      currency: row._id.currency,
      amount: Number(row.total.toFixed(2)),
    });
  }

  return orgs.map((o) => {
    const key = o._id.toString();
    const currencyMap = balanceMap.get(key) ?? {};
    return {
      _id: key,
      name: o.name,
      slug: o.slug,
      balances: Object.entries(currencyMap).map(([currency, b]) => ({
        currency,
        ...b,
      })),
      activeCampaignsBudget: budgetMap.get(key) ?? [],
    };
  });
}

/* ============================================================
   Refunds
============================================================ */

export class RefundError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "RefundError";
    this.statusCode = statusCode;
  }
}

/**
 * Refund an approved conversion. Creates offsetting ledger entries so the
 * balances move back correctly:
 *   - creator credit → offsetting debit
 *   - advertiser debit → offsetting credit
 *   - platform fee → reversal entry
 * Originals are marked "void". Conversion status becomes "reversed".
 */
export async function refundConversion(input: {
  conversionId: string;
  adminId: string;
  reason: string;
}) {
  if (!mongoose.isValidObjectId(input.conversionId)) {
    throw new RefundError("Invalid conversion.", 400);
  }
  if (!input.reason || input.reason.trim().length < 5) {
    throw new RefundError("A reason of at least 5 characters is required.", 400);
  }

  const conversion = await Conversion.findById(input.conversionId);
  if (!conversion) throw new RefundError("Conversion not found.", 404);
  if (conversion.status !== "approved") {
    throw new RefundError(
      `Only approved conversions can be refunded (current: ${conversion.status}).`,
      409,
    );
  }

  const ref = `conv:${conversion._id.toString()}`;
  const entries = await LedgerEntry.find({
    reference: { $regex: `^${ref}` },
    status: { $in: ["available", "pending"] },
  }).lean();

  if (entries.length === 0) {
    throw new RefundError("No ledger entries found to reverse.", 409);
  }

  const refundRef = `${ref}:refund:${Date.now()}`;
  const newEntries: Record<string, unknown>[] = [];

  for (const entry of entries) {
    if (entry.type === "credit") {
      // Creator earned money — debit it back.
      newEntries.push({
        userId: entry.userId,
        campaignId: entry.campaignId,
        type: "debit",
        status: "available",
        amount: entry.amount,
        currency: entry.currency,
        reference: refundRef,
        description: `Refund: ${input.reason.slice(0, 400)}`,
        metadata: { originalEntryId: entry._id.toString(), refundedBy: input.adminId },
      });
    } else if (entry.type === "debit") {
      // Advertiser was charged — credit it back.
      newEntries.push({
        organizationId: entry.organizationId,
        campaignId: entry.campaignId,
        type: "credit",
        status: "available",
        amount: entry.amount,
        currency: entry.currency,
        reference: refundRef,
        description: `Refund: ${input.reason.slice(0, 400)}`,
        metadata: { originalEntryId: entry._id.toString(), refundedBy: input.adminId },
      });
    } else if (entry.type === "fee") {
      // Platform fee — reverse it.
      newEntries.push({
        organizationId: entry.organizationId,
        campaignId: entry.campaignId,
        type: "reversal",
        status: "available",
        amount: entry.amount,
        currency: entry.currency,
        reference: refundRef,
        description: `Platform fee reversal: ${input.reason.slice(0, 400)}`,
        metadata: { originalEntryId: entry._id.toString(), refundedBy: input.adminId },
      });
    }
  }

  if (newEntries.length === 0) {
    throw new RefundError("No refundable entries were found.", 409);
  }

  // Insert offsets, then void originals.
  await LedgerEntry.insertMany(newEntries, { ordered: true });

  await LedgerEntry.updateMany(
    { _id: { $in: entries.map((e) => e._id) } },
    {
      $set: {
        status: "void",
        description: `Voided by refund: ${input.reason.slice(0, 400)}`,
      },
    },
  );

  // Mark the conversion as reversed.
  conversion.status = "reversed";
  conversion.rejectedBy = new mongoose.Types.ObjectId(input.adminId);
  conversion.rejectedAt = new Date();
  conversion.rejectionReason = `Refunded: ${input.reason.slice(0, 450)}`;
  await conversion.save();

  return {
    conversionId: conversion._id.toString(),
    entriesCreated: newEntries.length,
    entriesVoided: entries.length,
  };
}

/* ============================================================
   Manual deposit confirmation
============================================================ */

export async function listPendingDeposits(limit = 100) {
  return listDeposits({ status: "pending", limit });
}
