import mongoose from "mongoose";

import Conversion, {
  type ConversionSource,
} from "@/models/Conversion";
import Campaign from "@/models/Campaign";
import TrackingLink from "@/models/TrackingLink";
import {
  resolveAttributedClick,
  resolveAttributedTouches,
  getCampaignAttributionModel,
} from "@/services/attribution.service";
import {
  recordConversionPending,
  promoteConversion,
  reverseConversion,
  recordMultiCreditConversionPending,
} from "@/services/ledger.service";
import ConversionCredit from "@/models/ConversionCredit";
import { platformFeePct } from "@/lib/payments/billing-provider";
import { splitPlatformFee } from "@/services/wallet.service";
import { notifySafe } from "@/services/notification.service";
import { dispatchWebhookEvent } from "@/services/webhook-dispatcher.service";

export type RecordConversionInput = {
  campaignId: string;
  advertiserOrganizationId: string;
  amount: number;
  currency: string;
  clickId?: string;
  idempotencyKey: string;
  source: ConversionSource;
  externalId?: string;
  customerRef?: string;
  metadata?: Record<string, unknown>;
  convertedAt?: Date;
};

/** Idempotent conversion creation. Safe to call from webhooks. */
export async function recordConversion(input: RecordConversionInput) {
  const existing = await Conversion.findOne({
    idempotencyKey: input.idempotencyKey,
  }).lean();

  if (existing) {
    return { conversion: existing, deduplicated: true };
  }

  if (!mongoose.isValidObjectId(input.campaignId)) {
    throw Object.assign(new Error("Invalid campaign."), { statusCode: 400 });
  }
  const campaign = await Campaign.findById(input.campaignId).lean();
  if (!campaign) {
    throw Object.assign(new Error("Campaign not found."), { statusCode: 404 });
  }

  const convertedAt = input.convertedAt ?? new Date();

  // Resolve attribution. Uses the campaign's configured model.
  const model = await getCampaignAttributionModel(input.campaignId);

  const touches = input.clickId
    ? await resolveAttributedTouches({
        explicitClickId: input.clickId,
        convertedAt,
        model,
      })
    : [];

  // Legacy single-touch fallback.
  let creatorId: mongoose.Types.ObjectId | undefined;
  let trackingLinkId: mongoose.Types.ObjectId | undefined;
  let clickEventId: mongoose.Types.ObjectId | undefined;

  if (touches.length > 0) {
    // The single "primary" creator is the one with the largest weight.
    const primary = [...touches].sort((a, b) => b.weight - a.weight)[0]!;
    creatorId = primary.creatorId;
    clickEventId = primary.clickEventId;

    // Look up the tracking link for the primary touch if needed.
    if (input.clickId) {
      const resolved = await resolveAttributedClick(input.clickId, convertedAt);
      trackingLinkId = resolved?.link._id;
    }
  }

  const conversion = await Conversion.create({
    idempotencyKey: input.idempotencyKey,
    campaignId: campaign._id,
    creatorId,
    trackingLinkId,
    clickEventId,
    advertiserOrganizationId: new mongoose.Types.ObjectId(
      input.advertiserOrganizationId,
    ),
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    source: input.source,
    externalId: input.externalId,
    customerRef: input.customerRef,
    metadata: input.metadata,
    status: "pending",
  });

  // Bump the counter on the tracking link, if any.
  if (trackingLinkId) {
    await TrackingLink.updateOne(
      { _id: trackingLinkId },
      { $inc: { conversions: 1 } },
    );
  }

  // Write credits + ledger entries.
  if (creatorId && touches.length > 0) {
    const feePct = platformFeePct();
    const { platformFee, creatorAmount: totalCreatorAmount } = splitPlatformFee(
      conversion.amount,
      feePct,
    );

    // One ConversionCredit per touch, weighted by the model.
    const credits = touches.map((t) => ({
      conversionId: conversion._id,
      creatorId: t.creatorId,
      clickEventId: t.clickEventId,
      weight: t.weight,
      amount: Number((totalCreatorAmount * t.weight).toFixed(2)),
      currency: conversion.currency,
    }));

    // Fix rounding drift by giving the largest credit the remainder.
    const sum = credits.reduce((s, c) => s + c.amount, 0);
    const drift = Number((totalCreatorAmount - sum).toFixed(2));
    if (Math.abs(drift) > 0.001 && credits.length > 0) {
      credits.sort((a, b) => b.weight - a.weight);
      credits[0]!.amount = Number((credits[0]!.amount + drift).toFixed(2));
    }

    await ConversionCredit.insertMany(credits, { ordered: true });

    // Ledger entries — one credit per creator, one debit, one fee.
    await recordMultiCreditConversionPending({
      conversionId: conversion._id,
      organizationId: conversion.advertiserOrganizationId,
      campaignId: conversion.campaignId,
      amount: conversion.amount,
      currency: conversion.currency,
      platformFee,
      creatorCredits: credits.map((c) => ({
        creatorId: c.creatorId,
        amount: c.amount,
        weight: c.weight,
        clickEventId: c.clickEventId,
      })),
    });
  } else if (creatorId) {
    // Fallback for legacy single-touch when no touches resolve.
    const feePct = platformFeePct();
    const { platformFee } = splitPlatformFee(conversion.amount, feePct);
    await recordConversionPending({
      conversionId: conversion._id,
      organizationId: conversion.advertiserOrganizationId,
      creatorId,
      campaignId: conversion.campaignId,
      amount: conversion.amount,
      currency: conversion.currency,
      platformFee,
    });
  }

  return { conversion, deduplicated: false };
}

/** Approve a pending conversion → move ledger entries to available. */
export async function approveConversion(
  conversionId: string,
  reviewerId: string,
) {
  if (!mongoose.isValidObjectId(conversionId)) {
    throw Object.assign(new Error("Invalid conversion."), { statusCode: 400 });
  }
  const conversion = await Conversion.findById(conversionId);
  if (!conversion) {
    throw Object.assign(new Error("Conversion not found."), { statusCode: 404 });
  }
  if (conversion.status !== "pending") {
    throw Object.assign(new Error("Only pending conversions can be approved."), {
      statusCode: 409,
    });
  }

  conversion.status = "approved";
  conversion.approvedBy = new mongoose.Types.ObjectId(reviewerId);
  conversion.approvedAt = new Date();
  await conversion.save();

  await promoteConversion(conversion._id);

  if (conversion.creatorId) {
    notifySafe({
      userId: conversion.creatorId,
      type: "payment",
      title: "Conversion approved",
      message: `${conversion.currency} ${conversion.amount.toFixed(2)} has been credited to your available balance.`,
      href: "/creator/earnings",
    });
  }

  dispatchWebhookEvent({
    organizationId: conversion.advertiserOrganizationId.toString(),
    event: "conversion.approved",
    payload: {
      conversionId: conversion._id.toString(),
      campaignId: conversion.campaignId.toString(),
      amount: conversion.amount,
      currency: conversion.currency,
    },
  });

  return conversion;
}

/** Reject a pending conversion → reverse pending ledger entries. */
export async function rejectConversion(
  conversionId: string,
  reviewerId: string,
  reason?: string,
) {
  if (!mongoose.isValidObjectId(conversionId)) {
    throw Object.assign(new Error("Invalid conversion."), { statusCode: 400 });
  }
  const conversion = await Conversion.findById(conversionId);
  if (!conversion) {
    throw Object.assign(new Error("Conversion not found."), { statusCode: 404 });
  }
  if (conversion.status !== "pending") {
    throw Object.assign(new Error("Only pending conversions can be rejected."), {
      statusCode: 409,
    });
  }

  conversion.status = "rejected";
  conversion.rejectedBy = new mongoose.Types.ObjectId(reviewerId);
  conversion.rejectedAt = new Date();
  if (reason) conversion.rejectionReason = reason;
  await conversion.save();

  await reverseConversion(conversion._id, reason);

  if (conversion.creatorId) {
    notifySafe({
      userId: conversion.creatorId,
      type: "payment",
      title: "Conversion rejected",
      message: reason
        ? `Reason: ${reason}`
        : `The ${conversion.currency} ${conversion.amount.toFixed(2)} conversion was rejected.`,
      href: "/creator/earnings",
    });
  }

  dispatchWebhookEvent({
    organizationId: conversion.advertiserOrganizationId.toString(),
    event: "conversion.rejected",
    payload: {
      conversionId: conversion._id.toString(),
      campaignId: conversion.campaignId.toString(),
      reason,
    },
  });

  return conversion;
}
