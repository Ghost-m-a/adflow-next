import mongoose from "mongoose";

import TaxProfile, {
  type TaxFormType,
  type TaxStatus,
} from "@/models/TaxProfile";
import LedgerEntry from "@/models/LedgerEntry";
import User from "@/models/User";
import { encryptPii, last4 } from "@/lib/tax/encryption";
import { notifySafe } from "@/services/notification.service";

export class TaxError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "TaxError";
    this.statusCode = statusCode;
  }
}

function thresholdUsd(): number {
  const raw = process.env.TAX_THRESHOLD_USD;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 600;
}

/* ----------------------------------------------------------
   Earnings lookups
---------------------------------------------------------- */

/**
 * Sums lifetime creator earnings from approved ledger credits.
 * Uses ledger entries (not conversions) because they capture every
 * source of income — conversions AND content submissions.
 */
export async function getLifetimeEarningsByCurrency(userId: string) {
  const rows = await LedgerEntry.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: "credit",
        status: { $in: ["available", "held", "paid"] },
      },
    },
    { $group: { _id: "$currency", total: { $sum: "$amount" } } },
  ]);

  return Object.fromEntries(
    rows.map((r) => [r._id, Number(r.total.toFixed(2))]),
  ) as Record<string, number>;
}

/**
 * Returns whether a tax form is required before the next payout.
 * The rule: if lifetime USD-equivalent earnings exceed the threshold,
 * a form must be on file and approved. Non-USD is only checked when
 * the currency is USD — cross-currency is deliberately strict.
 */
export async function taxFormStatus(userId: string) {
  const [earnings, profile] = await Promise.all([
    getLifetimeEarningsByCurrency(userId),
    TaxProfile.findOne({ userId })
      .select("status tinLast4 formType country reviewedAt reviewNotes")
      .lean(),
  ]);

  const usd = earnings.USD ?? 0;
  const threshold = thresholdUsd();
  const required = usd >= threshold;
  const onFile = Boolean(profile);
  const approved = profile?.status === "approved";

  return {
    required,
    onFile,
    approved,
    threshold,
    earningsByCurrency: earnings,
    usdEarnings: usd,
    profile: profile
      ? {
          status: profile.status,
          formType: profile.formType,
          tinLast4: profile.tinLast4,
          country: profile.country,
          reviewedAt: profile.reviewedAt ?? null,
          reviewNotes: profile.reviewNotes ?? null,
        }
      : null,
    /** Whether the creator can currently request a payout. */
    canRequestPayout: !required || approved,
  };
}

/* ----------------------------------------------------------
   Submission
---------------------------------------------------------- */

export type SubmitTaxInput = {
  userId: string;
  formType: TaxFormType;
  legalName: string;
  businessName?: string;
  country: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
  };
  tin: string;
  isUsPerson: boolean;
  treatyCountry?: string;
  signatureName: string;
};

export async function submitTaxProfile(input: SubmitTaxInput) {
  if (!input.tin || input.tin.replace(/\D/g, "").length < 4) {
    throw new TaxError("A valid tax identification number is required.");
  }
  if (!input.signatureName.trim()) {
    throw new TaxError("Signature is required.");
  }
  if (
    input.isUsPerson &&
    input.formType !== "W-9"
  ) {
    throw new TaxError("US persons must submit Form W-9.");
  }
  if (
    !input.isUsPerson &&
    input.formType === "W-9"
  ) {
    throw new TaxError("Non-US persons must submit Form W-8BEN or W-8BEN-E.");
  }

  const tinEncrypted = encryptPii(input.tin.replace(/\D/g, ""));
  const tinLast4Value = last4(input.tin);

  const existing = await TaxProfile.findOne({ userId: input.userId });

  if (existing) {
    // Resubmitting after rejection or an update.
    existing.formType = input.formType;
    existing.legalName = input.legalName.trim();
    existing.businessName = input.businessName?.trim() || undefined;
    existing.country = input.country.toUpperCase();
    existing.address = {
      line1: input.address.line1.trim(),
      line2: input.address.line2?.trim(),
      city: input.address.city.trim(),
      state: input.address.state?.trim(),
      postalCode: input.address.postalCode.trim(),
    };
    existing.tinEncrypted = tinEncrypted;
    existing.tinLast4 = tinLast4Value;
    existing.isUsPerson = input.isUsPerson;
    existing.treatyCountry = input.treatyCountry?.toUpperCase();
    existing.signatureName = input.signatureName.trim();
    existing.signedAt = new Date();
    existing.status = "pending";
    existing.reviewedBy = undefined;
    existing.reviewedAt = undefined;
    existing.reviewNotes = undefined;
    await existing.save();
    return existing;
  }

  return TaxProfile.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    formType: input.formType,
    legalName: input.legalName.trim(),
    businessName: input.businessName?.trim() || undefined,
    country: input.country.toUpperCase(),
    address: {
      line1: input.address.line1.trim(),
      line2: input.address.line2?.trim(),
      city: input.address.city.trim(),
      state: input.address.state?.trim(),
      postalCode: input.address.postalCode.trim(),
    },
    tinEncrypted,
    tinLast4: tinLast4Value,
    isUsPerson: input.isUsPerson,
    treatyCountry: input.treatyCountry?.toUpperCase(),
    signatureName: input.signatureName.trim(),
    signedAt: new Date(),
    status: "pending",
  });
}

/* ----------------------------------------------------------
   Admin review
---------------------------------------------------------- */

export async function listTaxProfiles(input: {
  status?: TaxStatus | "all";
  limit?: number;
}) {
  const filter: Record<string, unknown> = {};
  if (input.status && input.status !== "all") filter.status = input.status;

  const profiles = await TaxProfile.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(input.limit ?? 100, 300))
    .populate({ path: "userId", select: "_id name username email country" })
    .lean();

  return profiles.map((p) => {
    const u = p.userId as unknown as {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      username?: string;
      email?: string;
      country?: string;
    } | null;

    return {
      _id: p._id.toString(),
      user: u
        ? {
            _id: u._id?.toString() ?? "",
            name: u.name ?? "",
            username: u.username ?? "",
            email: u.email ?? "",
            country: u.country ?? "",
          }
        : null,
      formType: p.formType,
      legalName: p.legalName,
      businessName: p.businessName ?? null,
      country: p.country,
      address: p.address,
      tinLast4: p.tinLast4,
      isUsPerson: p.isUsPerson,
      treatyCountry: p.treatyCountry ?? null,
      signatureName: p.signatureName,
      signedAt: p.signedAt,
      status: p.status,
      reviewedAt: p.reviewedAt ?? null,
      reviewNotes: p.reviewNotes ?? null,
      createdAt: p.createdAt,
    };
  });
}

export async function approveTaxProfile(profileId: string, adminId: string) {
  if (!mongoose.isValidObjectId(profileId)) {
    throw new TaxError("Invalid tax profile.", 400);
  }
  const profile = await TaxProfile.findById(profileId);
  if (!profile) throw new TaxError("Tax profile not found.", 404);
  if (profile.status === "approved") {
    throw new TaxError("Already approved.", 409);
  }

  profile.status = "approved";
  profile.reviewedBy = new mongoose.Types.ObjectId(adminId);
  profile.reviewedAt = new Date();
  profile.reviewNotes = undefined;
  await profile.save();

  notifySafe({
    userId: profile.userId,
    type: "payment",
    title: "Tax form approved",
    message: "Your tax information is on file. You can request payouts without restrictions.",
    href: "/creator/tax",
  });

  return profile;
}

export async function rejectTaxProfile(
  profileId: string,
  adminId: string,
  reason: string,
) {
  if (!mongoose.isValidObjectId(profileId)) {
    throw new TaxError("Invalid tax profile.", 400);
  }
  if (!reason || reason.trim().length < 5) {
    throw new TaxError("A reason of at least 5 characters is required.", 400);
  }

  const profile = await TaxProfile.findById(profileId);
  if (!profile) throw new TaxError("Tax profile not found.", 404);

  profile.status = "rejected";
  profile.reviewedBy = new mongoose.Types.ObjectId(adminId);
  profile.reviewedAt = new Date();
  profile.reviewNotes = reason.slice(0, 500);
  await profile.save();

  notifySafe({
    userId: profile.userId,
    type: "payment",
    title: "Tax form needs attention",
    message: `Your tax information could not be approved: ${reason.slice(0, 200)}`,
    href: "/creator/tax",
  });

  return profile;
}

/** Convenience used by the payout service. */
export async function assertPayoutAllowed(userId: string) {
  const status = await taxFormStatus(userId);
  if (status.required && !status.approved) {
    throw new TaxError(
      `A tax form must be on file before your next payout. Lifetime earnings of USD ${status.usdEarnings.toFixed(2)} cross the USD ${status.threshold} threshold.`,
      409,
    );
  }
  return status;
}

void User;
