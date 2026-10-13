import mongoose from "mongoose";

import CreatorProfile from "@/models/CreatorProfile";
import Campaign from "@/models/Campaign";
import Conversion from "@/models/Conversion";
import CampaignApplication from "@/models/CampaignApplication";

export type MatchReason = {
  label: string;
  weight: number;
  detail: string;
};

export type ScoredCreator = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  country: string;
  niches: string[];
  isVerified: boolean;
  score: number;
  reasons: MatchReason[];
  historical: {
    approvedConversions: number;
    approvalRate: number | null;
    totalEarningsUsd: number;
  };
};

export type ScoredCampaign = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  currency: string;
  rewardPerThousand: number;
  rewardPerCreator: number;
  supportedPlatforms: string[];
  budget: number;
  coverImageUrl: string;
  score: number;
  reasons: MatchReason[];
};

/* ============================================================
   Creator → Campaign scoring
============================================================ */

/** Match score when recommending a creator to a specific campaign. */
export async function scoreCreatorsForCampaign(input: {
  campaignId: string;
  limit?: number;
}): Promise<ScoredCreator[]> {
  if (!mongoose.isValidObjectId(input.campaignId)) return [];

  const campaign = await Campaign.findById(input.campaignId).lean();
  if (!campaign) return [];

  // Candidates: public, active creator profiles.
  const profiles = await CreatorProfile.find({
    isPublic: true,
  })
    .limit(300)
    .lean();

  if (profiles.length === 0) return [];

  // Exclude creators who already applied or were invited.
  const appliedIds = await CampaignApplication.find({
    campaignId: campaign._id,
  })
    .select("creatorId")
    .lean();
  const excluded = new Set(appliedIds.map((a) => a.creatorId.toString()));

  const historicals = await Conversion.aggregate<{
    _id: mongoose.Types.ObjectId;
    total: number;
    approved: number;
    earnings: number;
  }>([
    {
      $match: {
        creatorId: { $in: profiles.map((p) => p.userId) },
      },
    },
    {
      $group: {
        _id: "$creatorId",
        total: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        earnings: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
        },
      },
    },
  ]);
  const historyMap = new Map(
    historicals.map((h) => [h._id.toString(), h]),
  );

  const scored = profiles
    .filter((p) => !excluded.has(p.userId.toString()))
    .map((p) => scoreCreatorAgainstCampaign(p, campaign, historyMap.get(p.userId.toString())))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(input.limit ?? 20, 50));

  return scored;
}

function scoreCreatorAgainstCampaign(
  profile: {
    userId: mongoose.Types.ObjectId;
    username: string;
    displayName: string;
    avatarUrl?: string;
    country?: string;
    niches?: string[];
    isVerified?: boolean;
  },
  campaign: {
    category?: string;
    targetNiches?: string[];
    targetCountries?: string[];
    supportedPlatforms?: string[];
    platform?: string;
    budget?: number;
    rewardPerCreator?: number;
    rewardPerThousand?: number;
  },
  history?: { total: number; approved: number; earnings: number },
): ScoredCreator {
  const reasons: MatchReason[] = [];
  let score = 0;

  // 1. Niche match — highest weight.
  const niches = (profile.niches ?? []).map((n) => n.toLowerCase());
  const campaignNiches = [
    ...(campaign.targetNiches ?? []).map((n) => n.toLowerCase()),
    ...(campaign.category ? [campaign.category.toLowerCase()] : []),
  ];
  const nicheOverlap = niches.filter((n) => campaignNiches.includes(n));
  if (nicheOverlap.length > 0) {
    const weight = 30 * Math.min(1, nicheOverlap.length / 2);
    score += weight;
    reasons.push({
      label: "Niche match",
      weight,
      detail: `Works in ${nicheOverlap.join(", ")}`,
    });
  }

  // 2. Geographic match.
  const country = (profile.country ?? "").toUpperCase();
  const campaignCountries = (campaign.targetCountries ?? []).map((c) =>
    c.toUpperCase(),
  );
  if (campaignCountries.length === 0) {
    // Global campaign — no bonus, no penalty.
  } else if (campaignCountries.includes(country)) {
    score += 15;
    reasons.push({
      label: "Geography",
      weight: 15,
      detail: `Based in ${country}`,
    });
  } else {
    score -= 8;
    reasons.push({
      label: "Geography",
      weight: -8,
      detail: `Based in ${country || "unknown"} (outside target)`,
    });
  }

  // 3. Historical conversion performance.
  const total = history?.total ?? 0;
  const approved = history?.approved ?? 0;
  if (total > 0) {
    const approvalRate = approved / total;
    const weight = Math.round(approvalRate * 25);
    if (weight !== 0) {
      score += weight;
      reasons.push({
        label: "Track record",
        weight,
        detail: `${approved}/${total} approved (${(approvalRate * 100).toFixed(0)}%)`,
      });
    }
  } else {
    // Give new creators a small bonus so they can break in.
    score += 5;
    reasons.push({
      label: "New creator",
      weight: 5,
      detail: "No history yet — fresh start bonus",
    });
  }

  // 4. Verified flag.
  if (profile.isVerified) {
    score += 10;
    reasons.push({
      label: "Verified",
      weight: 10,
      detail: "Identity verified",
    });
  }

  // 5. Reward fit — creators in higher-CCPM niches get preference for
  // higher-rate campaigns. This prevents underpriced campaigns from
  // surfacing the top-of-the-market creators.
  const cpm = campaign.rewardPerThousand ?? campaign.rewardPerCreator ?? 0;
  if (cpm >= 5) {
    score += 5;
    reasons.push({
      label: "Reward fit",
      weight: 5,
      detail: "Above-market reward rate",
    });
  }

  return {
    userId: profile.userId.toString(),
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? "",
    country,
    niches: profile.niches ?? [],
    isVerified: Boolean(profile.isVerified),
    score: Math.max(0, score),
    reasons: reasons.sort((a, b) => b.weight - a.weight),
    historical: {
      approvedConversions: approved,
      approvalRate: total > 0 ? approved / total : null,
      totalEarningsUsd: history?.earnings ?? 0,
    },
  };
}

/* ============================================================
   Campaign → Creator scoring
============================================================ */

/** Match score when recommending campaigns to a specific creator. */
export async function scoreCampaignsForCreator(input: {
  userId: string;
  limit?: number;
}): Promise<ScoredCampaign[]> {
  const profile = await CreatorProfile.findOne({ userId: input.userId }).lean();
  if (!profile) return [];

  const campaigns = await Campaign.find({
    status: "active",
    isPublic: true,
  })
    .limit(200)
    .lean();

  if (campaigns.length === 0) return [];

  // Exclude campaigns the creator already applied to.
  const existing = await CampaignApplication.find({
    creatorId: new mongoose.Types.ObjectId(input.userId),
  })
    .select("campaignId")
    .lean();
  const excluded = new Set(existing.map((a) => a.campaignId.toString()));

  const niches = (profile.niches ?? []).map((n) => n.toLowerCase());
  const country = (profile.country ?? "").toUpperCase();

  const scored = campaigns
    .filter((c) => !excluded.has(c._id.toString()))
    .map((c) => {
      const reasons: MatchReason[] = [];
      let score = 0;

      // Niche overlap.
      const campaignNiches = [
        ...(c.targetNiches ?? []).map((n) => n.toLowerCase()),
        ...(c.category ? [c.category.toLowerCase()] : []),
      ];
      const overlap = niches.filter((n) => campaignNiches.includes(n));
      if (overlap.length > 0) {
        const weight = 30 * Math.min(1, overlap.length / 2);
        score += weight;
        reasons.push({
          label: "Niche match",
          weight,
          detail: overlap.join(", "),
        });
      }

      // Geography.
      const targets = (c.targetCountries ?? []).map((x) => x.toUpperCase());
      if (targets.length === 0) {
        score += 5;
        reasons.push({
          label: "Global",
          weight: 5,
          detail: "Open to creators worldwide",
        });
      } else if (targets.includes(country)) {
        score += 15;
        reasons.push({
          label: "Geography",
          weight: 15,
          detail: `Open in ${country}`,
        });
      } else {
        score -= 10;
        reasons.push({
          label: "Geography",
          weight: -10,
          detail: `Not open in ${country}`,
        });
      }

      // Budget headroom.
      const budget = c.budget ?? 0;
      if (budget >= 5000) {
        score += 8;
        reasons.push({
          label: "Large budget",
          weight: 8,
          detail: `${c.currency} ${budget.toLocaleString()}`,
        });
      }

      // High CPM.
      const cpm = c.rewardPerThousand ?? 0;
      if (cpm >= 5) {
        score += 10;
        reasons.push({
          label: "Reward rate",
          weight: 10,
          detail: `${c.currency} ${cpm.toFixed(2)} per 1K views`,
        });
      }

      // Freshness — campaigns posted in the last 7 days get a bump.
      const ageDays =
        (Date.now() - new Date(c.createdAt).getTime()) / 86400_000;
      if (ageDays < 7) {
        score += 5;
        reasons.push({
          label: "New",
          weight: 5,
          detail: "Posted this week",
        });
      }

      return {
        _id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        category: c.category ?? "",
        currency: c.currency,
        rewardPerThousand: c.rewardPerThousand ?? 0,
        rewardPerCreator: c.rewardPerCreator ?? 0,
        supportedPlatforms: c.supportedPlatforms ?? [],
        budget: c.budget ?? 0,
        coverImageUrl: c.coverImageUrl ?? "",
        score: Math.max(0, score),
        reasons: reasons.sort((a, b) => b.weight - a.weight),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(input.limit ?? 20, 50));

  return scored;
}
