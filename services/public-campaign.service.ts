import mongoose from "mongoose";

import Campaign from "@/models/Campaign";
import Conversion from "@/models/Conversion";
import CreatorProfile from "@/models/CreatorProfile";
import Organization from "@/models/Organization";
import CampaignApplication from "@/models/CampaignApplication";

export type PublicCampaign = {
  _id: string;
  slug: string;
  title: string;
  description: string;
  brief: string;
  platform: string;
  supportedPlatforms: string[];
  goal: string;
  status: string;
  budget: number;
  currency: string;
  rewardPerCreator: number;
  maxCreators: number;
  category: string;
  hashtags: string[];
  coverImageUrl: string;
  logoUrl: string;
  rewardModel: "per_creator" | "cpm" | "hybrid";
  rewardPerThousand: number;
  rewardPerVideo: number;
  minimumPayout: number;
  requirements: string[];
  referenceMaterials: string[];
  applicationDeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  organization: {
    _id: string;
    name: string;
    logoUrl: string;
    isVerified: boolean;
  } | null;
  slotsFilled: number;
  isAcceptingApplications: boolean;
};

export type CampaignLeader = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  approvedConversions: number;
};

export type RelatedCampaign = {
  _id: string;
  slug: string;
  title: string;
  category: string;
  coverImageUrl: string;
  currency: string;
  rewardPerThousand: number;
  budget: number;
  supportedPlatforms: string[];
};

/** Look up an active, public campaign by its slug. */
export async function getPublicCampaignBySlug(
  slug: string,
): Promise<PublicCampaign | null> {
  const campaign = await Campaign.findOne({
    slug: slug.toLowerCase(),
    isPublic: true,
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!campaign) return null;

  const [org, acceptedCount] = await Promise.all([
    Organization.findById(campaign.organizationId)
      .select("_id name logoUrl isVerified isSuspended")
      .lean(),
    CampaignApplication.countDocuments({
      campaignId: campaign._id,
      status: "accepted",
    }),
  ]);

  if (!org || org.isSuspended) return null;

  const now = new Date();
  const deadlinePassed =
    campaign.applicationDeadline && campaign.applicationDeadline <= now;
  const isAcceptingApplications =
    !deadlinePassed && acceptedCount < campaign.maxCreators;

  return {
    _id: campaign._id.toString(),
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description,
    brief: campaign.brief ?? "",
    platform: campaign.platform,
    supportedPlatforms: campaign.supportedPlatforms?.length
      ? campaign.supportedPlatforms
      : [campaign.platform],
    goal: campaign.goal,
    status: campaign.status,
    budget: campaign.budget,
    currency: campaign.currency,
    rewardPerCreator: campaign.rewardPerCreator,
    maxCreators: campaign.maxCreators,
    category: campaign.category ?? "",
    hashtags: campaign.hashtags ?? [],
    coverImageUrl: campaign.coverImageUrl ?? "",
    logoUrl: campaign.logoUrl ?? "",
    rewardModel: campaign.rewardModel ?? "per_creator",
    rewardPerThousand: campaign.rewardPerThousand ?? 0,
    rewardPerVideo: campaign.rewardPerVideo ?? 0,
    minimumPayout: campaign.minimumPayout ?? 0,
    requirements: campaign.requirements ?? [],
    referenceMaterials: campaign.referenceMaterials ?? [],
    applicationDeadline: campaign.applicationDeadline?.toISOString() ?? null,
    startsAt: campaign.startsAt?.toISOString() ?? null,
    endsAt: campaign.endsAt?.toISOString() ?? null,
    organization: {
      _id: org._id.toString(),
      name: org.name,
      logoUrl: org.logoUrl ?? "",
      isVerified: Boolean(org.isVerified),
    },
    slotsFilled: acceptedCount,
    isAcceptingApplications,
  };
}

/** Top approved creators for this campaign — up to 12. */
export async function getCampaignLeaderboard(
  campaignId: string,
  limit = 12,
): Promise<CampaignLeader[]> {
  if (!mongoose.isValidObjectId(campaignId)) return [];

  const agg = await Conversion.aggregate<{
    _id: mongoose.Types.ObjectId;
    approved: number;
  }>([
    {
      $match: {
        campaignId: new mongoose.Types.ObjectId(campaignId),
        status: "approved",
        creatorId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$creatorId",
        approved: { $sum: 1 },
      },
    },
    { $sort: { approved: -1 } },
    { $limit: limit },
  ]);

  if (agg.length === 0) return [];

  const profiles = await CreatorProfile.find({
    userId: { $in: agg.map((a) => a._id) },
  })
    .select("userId username displayName avatarUrl")
    .lean();

  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  return agg.map((row) => {
    const p = profileMap.get(row._id.toString());
    return {
      userId: row._id.toString(),
      username: p?.username ?? "",
      displayName: p?.displayName ?? "",
      avatarUrl: p?.avatarUrl ?? "",
      approvedConversions: row.approved,
    };
  });
}

/** Six related active campaigns, preferring the same category. */
export async function getRelatedCampaigns(
  campaign: { _id: string; category?: string },
): Promise<RelatedCampaign[]> {
  const baseFilter: Record<string, unknown> = {
    status: "active",
    isPublic: true,
    _id: { $ne: new mongoose.Types.ObjectId(campaign._id) },
  };

  const filter = campaign.category
    ? { ...baseFilter, category: campaign.category }
    : baseFilter;

  const rows = await Campaign.find(filter)
    .sort({ createdAt: -1 })
    .limit(6)
    .select(
      "_id slug title category coverImageUrl currency rewardPerThousand supportedPlatforms platform budget",
    )
    .lean();

  // If a category was specified but not enough matches, fall back to general.
  if (rows.length < 3 && campaign.category) {
    const fallback = await Campaign.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .select(
        "_id slug title category coverImageUrl currency rewardPerThousand supportedPlatforms platform budget",
      )
      .lean();

    const seen = new Set(rows.map((r) => r._id.toString()));
    for (const r of fallback) {
      if (!seen.has(r._id.toString())) {
        rows.push(r);
        seen.add(r._id.toString());
        if (rows.length >= 6) break;
      }
    }
  }

  return rows.slice(0, 6).map((c) => ({
    _id: c._id.toString(),
    slug: c.slug,
    title: c.title,
    category: c.category ?? "",
    coverImageUrl: c.coverImageUrl ?? "",
    currency: c.currency,
    rewardPerThousand: c.rewardPerThousand ?? 0,
    budget: c.budget,
    supportedPlatforms: c.supportedPlatforms?.length
      ? c.supportedPlatforms
      : [c.platform],
  }));
}
