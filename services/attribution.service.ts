import mongoose from "mongoose";

import TrackingLink from "@/models/TrackingLink";
import ClickEvent from "@/models/ClickEvent";
import { clickFingerprint, hashIp, hashUserAgent } from "@/lib/tracking/fingerprint";
import { pickAttributedClick } from "@/lib/tracking/attribution";

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

/** Records a click event and increments the tracking link counters. */
export async function recordClick(input: RecordClickInput) {
  const ipHash = hashIp(input.ip);
  const userAgentHash = hashUserAgent(input.userAgent);
  const fingerprint = clickFingerprint({
    ipHash,
    userAgentHash,
    campaignId: input.trackingLink.campaignId.toString(),
  });

  // Skip duplicates from the same fingerprint within 30 seconds.
  const recent = await ClickEvent.findOne({
    fingerprint,
    createdAt: { $gte: new Date(Date.now() - 30_000) },
  })
    .select("_id")
    .lean();

  if (recent) {
    return { click: recent, deduplicated: true };
  }

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

/**
 * Given a click id, returns the click plus the tracking link details
 * needed for attribution. Enforces the attribution window.
 */
export async function resolveAttributedClick(
  clickId: string,
  convertedAt: Date,
) {
  if (!mongoose.isValidObjectId(clickId)) return null;

  const click = await ClickEvent.findById(clickId).lean();
  if (!click) return null;

  const link = await TrackingLink.findById(click.trackingLinkId).lean();
  if (!link || !link.isActive) return null;

  const winner = pickAttributedClick([{ ...click, createdAt: click.createdAt }], convertedAt);
  if (!winner) return null;

  return { click, link };
}
