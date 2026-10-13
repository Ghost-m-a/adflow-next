import mongoose from "mongoose";

import Campaign from "@/models/Campaign";
import ClickEvent from "@/models/ClickEvent";
import Conversion from "@/models/Conversion";
import LedgerEntry from "@/models/LedgerEntry";
import DailyCampaignStats from "@/models/DailyCampaignStats";

export type RollupResult = {
  date: string;
  campaignsProcessed: number;
  rowsWritten: number;
  errors: Array<{ campaignId: string; error: string }>;
};

/** Returns the UTC date string (YYYY-MM-DD) for a given Date or offset. */
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns the start/end UTC instants for a YYYY-MM-DD date. */
function dateWindow(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

/**
 * Computes rollups for a specific date (defaults to yesterday UTC).
 * Idempotent — running twice for the same date replaces the rows.
 */
export async function runDailyRollups(
  input: { date?: string; campaignIds?: string[] } = {},
): Promise<RollupResult> {
  const date =
    input.date ??
    dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const { start, end } = dateWindow(date);

  const campaignFilter: Record<string, unknown> = {};
  if (input.campaignIds?.length) {
    campaignFilter._id = {
      $in: input.campaignIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  const campaigns = await Campaign.find(campaignFilter)
    .select("_id organizationId currency")
    .lean();

  const result: RollupResult = {
    date,
    campaignsProcessed: 0,
    rowsWritten: 0,
    errors: [],
  };

  for (const campaign of campaigns) {
    try {
      const [
        clicks,
        convAgg,
        spendAgg,
      ] = await Promise.all([
        ClickEvent.countDocuments({
          campaignId: campaign._id,
          createdAt: { $gte: start, $lte: end },
        }),
        Conversion.aggregate<{
          total: number;
          approved: number;
          pending: number;
          rejected: number;
          reversed: number;
        }>([
          {
            $match: {
              campaignId: campaign._id,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
              reversed: { $sum: { $cond: [{ $eq: ["$status", "reversed"] }, 1, 0] } },
            },
          },
        ]),
        LedgerEntry.aggregate<{ spend: number; fees: number }>([
          {
            $match: {
              campaignId: campaign._id,
              createdAt: { $gte: start, $lte: end },
              status: { $in: ["available", "paid"] },
              reference: { $regex: /^conv:/ },
            },
          },
          {
            $group: {
              _id: null,
              spend: {
                $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] },
              },
              fees: {
                $sum: { $cond: [{ $eq: ["$type", "fee"] }, "$amount", 0] },
              },
            },
          },
        ]),
      ]);

      const conv = convAgg[0] ?? {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        reversed: 0,
      };

      const spend = spendAgg[0] ?? { spend: 0, fees: 0 };

      await DailyCampaignStats.findOneAndUpdate(
        { campaignId: campaign._id, date },
        {
          $set: {
            organizationId: campaign.organizationId,
            currency: campaign.currency,
            clicks,
            conversions: conv.total,
            approved: conv.approved,
            pending: conv.pending,
            rejected: conv.rejected,
            reversed: conv.reversed,
            spend: Number(spend.spend.toFixed(2)),
            fees: Number(spend.fees.toFixed(2)),
          },
        },
        { upsert: true, new: true },
      );

      result.campaignsProcessed += 1;
      result.rowsWritten += 1;
    } catch (err) {
      result.errors.push({
        campaignId: campaign._id.toString(),
        error: err instanceof Error ? err.message : "Unknown error.",
      });
    }
  }

  return result;
}

/**
 * Backfills rollups for the last N days. Useful after deploying
 * this feature on an existing dataset.
 */
export async function backfillRollups(days: number): Promise<RollupResult[]> {
  const results: RollupResult[] = [];
  const bounded = Math.min(days, 180);

  for (let i = 1; i <= bounded; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    results.push(await runDailyRollups({ date: dateKey(d) }));
  }

  return results;
}
