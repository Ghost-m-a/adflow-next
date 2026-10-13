import mongoose from "mongoose";

import CreatorProfile from "@/models/CreatorProfile";
import User from "@/models/User";
import Conversion from "@/models/Conversion";
import Campaign from "@/models/Campaign";
import CampaignApplication from "@/models/CampaignApplication";

export type PublicCreatorProfile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  country: string;
  languages: string[];
  niches: string[];
  socialLinks: Array<{ platform: string; url: string; handle?: string }>;
  isVerified: boolean;
  joinedAt: string;
  stats: {
    campaignsCompleted: number;
    campaignsActive: number;
    totalConversions: number;
    approvedConversions: number;
    approvalRate: number | null;
    totalEarningsByCurrency: Array<{
      currency: string;
      amount: number;
    }>;
  };
};

export async function getPublicProfile(
  username: string,
): Promise<PublicCreatorProfile | null> {
  const normalized = username.toLowerCase();
  const profile = await CreatorProfile.findOne({
    username: normalized,
    isPublic: true,
  }).lean();

  if (!profile) return null;

  const [user, apps, convAgg] = await Promise.all([
    User.findById(profile.userId).select("createdAt isActive").lean(),
    CampaignApplication.find({
      creatorId: profile.userId,
      status: "accepted",
    })
      .select("campaignId")
      .lean(),
    Conversion.aggregate<{
      _id: string;
      conversions: number;
      approved: number;
      amount: number;
    }>([
      { $match: { creatorId: profile.userId } },
      {
        $group: {
          _id: "$currency",
          conversions: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          amount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },
        },
      },
    ]),
  ]);

  // Determine completed vs active campaigns.
  const campaignIds = apps.map((a) => a.campaignId);
  const statuses = await Campaign.find({ _id: { $in: campaignIds } })
    .select("status")
    .lean();

  const campaignsCompleted = statuses.filter((c) => c.status === "completed").length;
  const campaignsActive = statuses.filter((c) =>
    ["active", "paused"].includes(c.status),
  ).length;

  const totalConversions = convAgg.reduce((s, c) => s + c.conversions, 0);
  const approvedConversions = convAgg.reduce((s, c) => s + c.approved, 0);
  const approvalRate =
    totalConversions > 0 ? approvedConversions / totalConversions : null;

  return {
    userId: profile.userId.toString(),
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    country: profile.country ?? "",
    languages: profile.languages ?? [],
    niches: profile.niches ?? [],
    socialLinks: (profile.socialLinks ?? []).map((s) => ({
      platform: s.platform,
      url: s.url,
      handle: s.handle,
    })),
    isVerified: profile.isVerified,
    joinedAt: (user?.createdAt ?? profile.createdAt).toISOString(),
    stats: {
      campaignsCompleted,
      campaignsActive,
      totalConversions,
      approvedConversions,
      approvalRate,
      totalEarningsByCurrency: convAgg
        .filter((c) => c.amount > 0)
        .map((c) => ({
          currency: c._id,
          amount: Number(c.amount.toFixed(2)),
        })),
    },
  };
}

/** Discover public profiles with simple filters, capped for the marketplace. */
export async function discoverProfiles(input: {
  q?: string;
  niche?: string;
  country?: string;
  limit?: number;
}) {
  const filter: Record<string, unknown> = { isPublic: true };

  if (input.niche) filter.niches = input.niche.toLowerCase();
  if (input.country) filter.country = input.country.toUpperCase();

  if (input.q) {
    const rx = new RegExp(
      input.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { username: rx },
      { displayName: rx },
      { bio: rx },
    ];
  }

  const profiles = await CreatorProfile.find(filter)
    .sort({ isVerified: -1, createdAt: -1 })
    .limit(Math.min(input.limit ?? 30, 60))
    .lean();

  // Aggregate conversion counts per creator in one pass.
  const userIds = profiles.map((p) => p.userId);
  const convs = await Conversion.aggregate<{
    _id: mongoose.Types.ObjectId;
    approved: number;
  }>([
    {
      $match: {
        creatorId: { $in: userIds },
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$creatorId",
        approved: { $sum: 1 },
      },
    },
  ]);

  const convMap = new Map(convs.map((c) => [c._id.toString(), c.approved]));

  return profiles.map((p) => ({
    userId: p.userId.toString(),
    username: p.username,
    displayName: p.displayName,
    bio: (p.bio ?? "").slice(0, 200),
    avatarUrl: p.avatarUrl ?? "",
    country: p.country ?? "",
    niches: p.niches ?? [],
    isVerified: p.isVerified,
    approvedConversions: convMap.get(p.userId.toString()) ?? 0,
  }));
}
