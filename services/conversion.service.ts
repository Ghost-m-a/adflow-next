import mongoose from "mongoose";

import Conversion, {
  type ConversionSource,
} from "@/models/Conversion";
import Campaign from "@/models/Campaign";
import TrackingLink from "@/models/TrackingLink";
import { resolveAttributedClick } from "@/services/attribution.service";
import {
  recordConversionPending,
  promoteConversion,
  reverseConversion,
} from "@/services/ledger.service";
import { notifySafe } from "@/services/notification.service";

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

  // Attribute the conversion to a click when a click id was provided.
  let creatorId: mongoose.Types.ObjectId | undefined;
  let trackingLinkId: mongoose.Types.ObjectId | undefined;
  let clickEventId: mongoose.Types.ObjectId | undefined;

  if (input.clickId) {
    const resolved = await resolveAttributedClick(input.clickId, convertedAt);
    if (resolved) {
      creatorId = resolved.click.creatorId;
      trackingLinkId = resolved.link._id;
      clickEventId = resolved.click._id;
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

  // Create pending ledger entries (only if we know who to pay).
  if (creatorId) {
    await recordConversionPending({
      conversionId: conversion._id,
      organizationId: conversion.advertiserOrganizationId,
      creatorId,
      campaignId: conversion.campaignId,
      amount: conversion.amount,
      currency: conversion.currency,
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

  return conversion;
}
