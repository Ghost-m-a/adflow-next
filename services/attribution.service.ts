import mongoose from "mongoose";

import TrackingLink from "@/models/TrackingLink";
import ClickEvent from "@/models/ClickEvent";
import Campaign from "@/models/Campaign";
import { clickFingerprint, hashIp, hashUserAgent } from "@/lib/tracking/fingerprint";
import { isWithinWindow, attributionWindowMs } from "@/lib/tracking/attribution";

export type RecordClickInput = {
  trackingLink: {
    _id: mongoose.Types.ObjectId;
    campaignId: mongoose.Types.ObjectId;
    creatorId: mongoose.Types.ObjectId;
  };
  ip: string;
  userAgent: string;
  referrer?: string;
  country?: string;
};

export async function recordClick(input: RecordClickInput) {
  const ipHash = hashIp(input.ip);
  const userAgentHash = hashUserAgent(input.userAgent);
  const fingerprint = clickFingerprint({
    ipHash,
    userAgentHash,
    campaignId: input.trackingLink.campaignId.toString(),
  });

  const recent = await ClickEvent.findOne({
    fingerprint,
    createdAt: { $gte: new Date(Date.now() - 30_000) },
  })
    .select("_id")
    .lean();

  if (recent) return { click: recent, deduplicated: true };

  const click = await ClickEvent.create({
    trackingLinkId: input.trackingLink._id,
    campaignId: input.trackingLink.campaignId,
    creatorId: input.trackingLink.creatorId,
    ipHash,
    userAgentHash,
    fingerprint,
    referrer: input.referrer,
    country: input.country,
  });

  await TrackingLink.updateOne(
    { _id: input.trackingLink._id },
    { $inc: { clicks: 1 } },
  );

  return { click, deduplicated: false };
}

/* ============================================================
   Attribution models
============================================================ */

export type AttributedTouch = {
  clickEventId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  weight: number;
  clickedAt: Date;
};

export type AttributionModel =
  | "last_click"
  | "first_click"
  | "linear"
  | "time_decay";

/**
 * Given a fingerprint (or explicit clickId), returns all touches
 * attributed to this conversion within the window, with weights
 * that sum to 1.0.
 *
 * Called from the conversion service when a conversion is created.
 * Falls back to the single click if fingerprint lookup finds nothing.
 */
export async function resolveAttributedTouches(input: {
  fingerprint?: string;
  explicitClickId?: string;
  convertedAt: Date;
  model: AttributionModel;
}): Promise<AttributedTouch[]> {
  const windowStart = new Date(
    input.convertedAt.getTime() - attributionWindowMs(),
  );

  // 1. Gather candidate clicks.
  let clicks: Array<{
    _id: mongoose.Types.ObjectId;
    creatorId: mongoose.Types.ObjectId;
    createdAt: Date;
  }> = [];

  if (input.fingerprint) {
    clicks = await ClickEvent.find({
      fingerprint: input.fingerprint,
      createdAt: { $gte: windowStart, $lte: input.convertedAt },
    })
      .sort({ createdAt: 1 })
      .select("_id creatorId createdAt")
      .lean();
  }

  // Fallback / explicit path — if no fingerprint touches found.
  if (clicks.length === 0 && input.explicitClickId) {
    if (mongoose.isValidObjectId(input.explicitClickId)) {
      const click = await ClickEvent.findById(input.explicitClickId)
        .select("_id creatorId createdAt")
        .lean();

      if (click && isWithinWindow(click.createdAt, input.convertedAt)) {
        clicks = [click];
      }
    }
  }

  if (clicks.length === 0) return [];

  // 2. Apply the model to produce weighted touches.
  return applyModel(clicks, input.model, input.convertedAt);
}

function applyModel(
  clicks: Array<{
    _id: mongoose.Types.ObjectId;
    creatorId: mongoose.Types.ObjectId;
    createdAt: Date;
  }>,
  model: AttributionModel,
  convertedAt: Date,
): AttributedTouch[] {
  if (clicks.length === 0) return [];

  if (model === "first_click") {
    const first = clicks[0]!;
    return [
      {
        clickEventId: first._id,
        creatorId: first.creatorId,
        weight: 1,
        clickedAt: first.createdAt,
      },
    ];
  }

  if (model === "last_click") {
    const last = clicks[clicks.length - 1]!;
    return [
      {
        clickEventId: last._id,
        creatorId: last.creatorId,
        weight: 1,
        clickedAt: last.createdAt,
      },
    ];
  }

  if (model === "linear") {
    // Every touch gets an equal share.
    const w = 1 / clicks.length;
    return clicks.map((c) => ({
      clickEventId: c._id,
      creatorId: c.creatorId,
      weight: w,
      clickedAt: c.createdAt,
    }));
  }

  // time_decay — touches closer to conversion get more weight.
  const halfLifeMs = 3 * 24 * 60 * 60 * 1000; // 3 days
  const weights = clicks.map((c) => {
    const ageMs = convertedAt.getTime() - c.createdAt.getTime();
    return Math.pow(2, -ageMs / halfLifeMs);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  return clicks.map((c, i) => ({
    clickEventId: c._id,
    creatorId: c.creatorId,
    weight: weights[i]! / total,
    clickedAt: c.createdAt,
  }));
}

/** Resolves the attribution model for a campaign. */
export async function getCampaignAttributionModel(
  campaignId: string,
): Promise<AttributionModel> {
  const campaign = await Campaign.findById(campaignId)
    .select("attributionModel")
    .lean();

  const value = campaign?.attributionModel;
  if (
    value === "last_click" ||
    value === "first_click" ||
    value === "linear" ||
    value === "time_decay"
  ) {
    return value;
  }
  return "last_click";
}

/** Backwards-compat resolver for the old last-click-only flow. */
export async function resolveAttributedClick(
  clickId: string,
  convertedAt: Date,
) {
  if (!mongoose.isValidObjectId(clickId)) return null;
  const click = await ClickEvent.findById(clickId).lean();
  if (!click) return null;
  const link = await TrackingLink.findById(click.trackingLinkId).lean();
  if (!link || !link.isActive) return null;
  if (!isWithinWindow(click.createdAt, convertedAt)) return null;
  return { click, link };
}
