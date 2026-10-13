import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import LedgerEntry from "@/models/LedgerEntry";
import Campaign from "@/models/Campaign";
import {
  getBudgetCommitments,
  getOrganizationBalances,
} from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const organizationId = req.nextUrl.searchParams.get("organizationId");
    if (!organizationId || !mongoose.isValidObjectId(organizationId)) {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, [
      "owner",
      "admin",
      "manager",
      "member",
      "viewer",
    ]);
    await connectToDatabase();

    const [balances, committed, entries] = await Promise.all([
      getOrganizationBalances(organizationId),
      getBudgetCommitments(organizationId),
      LedgerEntry.find({ organizationId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const campaignIds = [
      ...new Set(
        entries
          .map((e) => e.campaignId?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const campaigns = campaignIds.length
      ? await Campaign.find({ _id: { $in: campaignIds } })
          .select("_id title slug")
          .lean()
      : [];
    const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));

    return NextResponse.json({
      balances,
      committed,
      entries: entries.map((e) => ({
        _id: e._id.toString(),
        type: e.type,
        status: e.status,
        amount: e.amount,
        currency: e.currency,
        reference: e.reference,
        description: e.description ?? "",
        createdAt: e.createdAt,
        campaign: e.campaignId
          ? campaignMap.get(e.campaignId.toString()) ?? null
          : null,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load transactions." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
