import mongoose from "mongoose";

import Campaign from "@/models/Campaign";
import ClickEvent from "@/models/ClickEvent";
import Conversion from "@/models/Conversion";
import CreatorProfile from "@/models/CreatorProfile";
import Membership from "@/models/Membership";
import DailyCampaignStats from "@/models/DailyCampaignStats";
import Organization from "@/models/Organization";

export type RangeKey = "7d" | "30d" | "90d" | "all";

/** Ranges greater than this use rollups for the tail. */
const ROLLUP_THRESHOLD_DAYS = 14;

export function shouldUseRollups(from: Date): boolean {
  const days = Math.ceil((Date.now() - from.getTime()) / 86400_000);
  return days > ROLLUP_THRESHOLD_DAYS;
}

/**
 * Reads aggregated stats from the daily rollup table. Used for the
 * older portion of a large range so the analytics page stays fast.
 */
export async function getRollupTotals(
  campaignIds: mongoose.Types.ObjectId[],
  from: Date,
  to: Date,
): Promise<{
  clicks: number;
  conversions: number;
  approved: number;
  spend: number;
  fees: number;
}> {
  if (campaignIds.length === 0) {
    return { clicks: 0, conversions: 0, approved: 0, spend: 0, fees: 0 };
  }

  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);

  const rows = await DailyCampaignStats.aggregate<{
    _id: null;
    clicks: number;
    conversions: number;
    approved: number;
    spend: number;
    fees: number;
  }>([
    {
      $match: {
        campaignId: { $in: campaignIds },
        date: { $gte: fromKey, $lte: toKey },
      },
    },
    {
      $group: {
        _id: null,
        clicks: { $sum: "$clicks" },
        conversions: { $sum: "$conversions" },
        approved: { $sum: "$approved" },
        spend: { $sum: "$spend" },
        fees: { $sum: "$fees" },
      },
    },
  ]);

  const r = rows[0];
  return r
    ? {
        clicks: r.clicks,
        conversions: r.conversions,
        approved: r.approved,
        spend: Number(r.spend.toFixed(2)),
        fees: Number(r.fees.toFixed(2)),
      }
    : { clicks: 0, conversions: 0, approved: 0, spend: 0, fees: 0 };
}

export function parseRange(range: string | null | undefined): {
  range: RangeKey;
  from: Date;
} {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  switch (range) {
    case "7d":
      return { range: "7d", from: new Date(now.getTime() - 7 * dayMs) };
    case "90d":
      return { range: "90d", from: new Date(now.getTime() - 90 * dayMs) };
    case "all":
      return { range: "all", from: new Date(0) };
    case "30d":
    default:
      return { range: "30d", from: new Date(now.getTime() - 30 * dayMs) };
  }
}

/** Campaign IDs the caller can see, via org ownership or membership. */
export async function getAccessibleCampaignIds(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);

  const [owned, memberships] = await Promise.all([
    Organization.find({ ownerId: uid, isSuspended: false })
      .select("_id")
      .lean(),
    Membership.find({ userId: uid }).select("organizationId").lean(),
  ]);

  const orgIds = [
    ...new Set([
      ...owned.map((o) => o._id.toString()),
      ...memberships.map((m) => m.organizationId.toString()),
    ]),
  ];

  if (orgIds.length === 0) return { orgIds: [], campaignIds: [] as mongoose.Types.ObjectId[] };

  const campaigns = await Campaign.find({ organizationId: { $in: orgIds } })
    .select("_id")
    .lean();

  return {
    orgIds,
    campaignIds: campaigns.map((c) => c._id),
  };
}

export type Overview = {
  clicks: number;
  conversions: number;
  approved: number;
  pending: number;
  rejected: number;
  ctr: number | null;
  conversionRate: number | null;
  approvalRate: number | null;
  spendByCurrency: Array<{
    currency: string;
    approvedSpend: number;
    pendingSpend: number;
  }>;
};

export async function getOverview(
  campaignIds: mongoose.Types.ObjectId[],
  from: Date,
): Promise<Overview> {
  if (campaignIds.length === 0) {
    return {
      clicks: 0,
      conversions: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      ctr: null,
      conversionRate: null,
      approvalRate: null,
      spendByCurrency: [],
    };
  }

  const [clicks, convAgg, spendAgg] = await Promise.all([
    ClickEvent.countDocuments({
      campaignId: { $in: campaignIds },
      createdAt: { $gte: from },
    }),
    Conversion.aggregate<{
      total: number;
      approved: number;
      pending: number;
      rejected: number;
    }>([
      { $match: { campaignId: { $in: campaignIds }, createdAt: { $gte: from } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]),
    Conversion.aggregate<{
      _id: string;
      approvedSpend: number;
      pendingSpend: number;
    }>([
      { $match: { campaignId: { $in: campaignIds }, createdAt: { $gte: from } } },
      {
        $group: {
          _id: "$currency",
          approvedSpend: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },
          pendingSpend: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const c = convAgg[0] ?? { total: 0, approved: 0, pending: 0, rejected: 0 };

  return {
    clicks,
    conversions: c.total,
    approved: c.approved,
    pending: c.pending,
    rejected: c.rejected,
    ctr: clicks > 0 ? c.total / clicks : null,
    conversionRate: clicks > 0 ? c.approved / clicks : null,
    approvalRate: c.total > 0 ? c.approved / c.total : null,
    spendByCurrency: spendAgg.map((s) => ({
      currency: s._id,
      approvedSpend: Number(s.approvedSpend.toFixed(2)),
      pendingSpend: Number(s.pendingSpend.toFixed(2)),
    })),
  };
}

export type CampaignMetric = {
  _id: string;
  title: string;
  status: string;
  currency: string;
  budget: number;
  clicks: number;
  conversions: number;
  approved: number;
  pending: number;
  spend: number;
  ctr: number | null;
  conversionRate: number | null;
  cpa: number | null;
};

export async function getCampaignMetrics(
  campaignIds: mongoose.Types.ObjectId[],
  from: Date,
): Promise<CampaignMetric[]> {
  if (campaignIds.length === 0) return [];

  const campaigns = await Campaign.find({ _id: { $in: campaignIds } })
    .select("_id title status currency budget")
    .lean();

  const [clicksAgg, convAgg] = await Promise.all([
    ClickEvent.aggregate<{ _id: mongoose.Types.ObjectId; clicks: number }>([
      { $match: { campaignId: { $in: campaignIds }, createdAt: { $gte: from } } },
      { $group: { _id: "$campaignId", clicks: { $sum: 1 } } },
    ]),
    Conversion.aggregate<{
      _id: mongoose.Types.ObjectId;
      total: number;
      approved: number;
      pending: number;
      spend: number;
    }>([
      { $match: { campaignId: { $in: campaignIds }, createdAt: { $gte: from } } },
      {
        $group: {
          _id: "$campaignId",
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          spend: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },
        },
      },
    ]),
  ]);

  const clickMap = new Map(clicksAgg.map((c) => [c._id.toString(), c.clicks]));
  const convMap = new Map(convAgg.map((c) => [c._id.toString(), c]));

  return campaigns.map((campaign) => {
    const clicks = clickMap.get(campaign._id.toString()) ?? 0;
    const conv = convMap.get(campaign._id.toString());

    const total = conv?.total ?? 0;
    const approved = conv?.approved ?? 0;
    const pending = conv?.pending ?? 0;
    const spend = Number((conv?.spend ?? 0).toFixed(2));

    return {
      _id: campaign._id.toString(),
      title: campaign.title,
      status: campaign.status,
      currency: campaign.currency,
      budget: campaign.budget,
      clicks,
      conversions: total,
      approved,
      pending,
      spend,
      ctr: clicks > 0 ? total / clicks : null,
      conversionRate: clicks > 0 ? approved / clicks : null,
      cpa: approved > 0 ? Number((spend / approved).toFixed(2)) : null,
    };
  });
}

export type CreatorMetric = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  conversions: number;
  approved: number;
  earnings: number;
  currency: string;
};

export async function getCreatorLeaderboard(
  campaignIds: mongoose.Types.ObjectId[],
  from: Date,
  limit = 20,
): Promise<CreatorMetric[]> {
  if (campaignIds.length === 0) return [];

  const agg = await Conversion.aggregate<{
    _id: mongoose.Types.ObjectId;
    conversions: number;
    approved: number;
    earnings: number;
    currency: string;
  }>([
    {
      $match: {
        campaignId: { $in: campaignIds },
        createdAt: { $gte: from },
        creatorId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$creatorId",
        conversions: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        earnings: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
        },
        currency: { $first: "$currency" },
      },
    },
    { $sort: { approved: -1, conversions: -1 } },
    { $limit: limit },
  ]);

  if (agg.length === 0) return [];

  const userIds = agg.map((a) => a._id);
  const profiles = await CreatorProfile.find({ userId: { $in: userIds } })
    .select("userId username displayName avatarUrl")
    .lean();

  const profileMap = new Map(
    profiles.map((p) => [p.userId.toString(), p]),
  );

  return agg.map((row) => {
    const profile = profileMap.get(row._id.toString());
    return {
      userId: row._id.toString(),
      username: profile?.username ?? "",
      displayName: profile?.displayName ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      conversions: row.conversions,
      approved: row.approved,
      earnings: Number(row.earnings.toFixed(2)),
      currency: row.currency,
    };
  });
}

export type TimePoint = {
  date: string; // YYYY-MM-DD
  clicks: number;
  conversions: number;
  approved: number;
};

export async function getTimeSeries(
  campaignIds: mongoose.Types.ObjectId[],
  from: Date,
): Promise<TimePoint[]> {
  if (campaignIds.length === 0) return [];

  const [clickRows, convRows] = await Promise.all([
    ClickEvent.aggregate<{ _id: string; clicks: number }>([
      { $match: { campaignId: { $in: campaignIds }, createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          clicks: { $sum: 1 },
        },
      },
    ]),
    Conversion.aggregate<{
      _id: string;
      conversions: number;
      approved: number;
    }>([
      { $match: { campaignId: { $in: campaignIds }, createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          conversions: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const map = new Map<string, TimePoint>();

  for (const row of clickRows) {
    map.set(row._id, {
      date: row._id,
      clicks: row.clicks,
      conversions: 0,
      approved: 0,
    });
  }
  for (const row of convRows) {
    const existing = map.get(row._id) ?? {
      date: row._id,
      clicks: 0,
      conversions: 0,
      approved: 0,
    };
    existing.conversions = row.conversions;
    existing.approved = row.approved;
    map.set(row._id, existing);
  }

  // Backfill missing days inside the range so the chart is continuous.
  const points: TimePoint[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = from.getTime() === 0 ? null : new Date(from);
  if (start) start.setUTCHours(0, 0, 0, 0);

  const daysBack = start
    ? Math.ceil((today.getTime() - start.getTime()) / 86400_000)
    : 30;
  const maxDays = Math.min(daysBack, 180);

  for (let i = maxDays; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    const existing = map.get(key);
    points.push(
      existing ?? { date: key, clicks: 0, conversions: 0, approved: 0 },
    );
  }

  return points;
}
