import mongoose from "mongoose";

import Organization from "@/models/Organization";
import Membership from "@/models/Membership";
import Campaign from "@/models/Campaign";
import User from "@/models/User";

export class AgencyError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AgencyError";
    this.statusCode = statusCode;
  }
}

/** Marks an organization as an agency. Owner only. */
export async function enableAgencyMode(organizationId: string) {
  if (!mongoose.isValidObjectId(organizationId)) {
    throw new AgencyError("Invalid organization.", 400);
  }
  const org = await Organization.findById(organizationId);
  if (!org) throw new AgencyError("Organization not found.", 404);
  if (org.parentAgencyId) {
    throw new AgencyError(
      "Client organizations cannot become agencies.",
      409,
    );
  }
  if (org.isAgency) return org;

  org.isAgency = true;
  await org.save();
  return org;
}

export async function disableAgencyMode(organizationId: string) {
  const clients = await Organization.countDocuments({
    parentAgencyId: organizationId,
  });
  if (clients > 0) {
    throw new AgencyError(
      `Cannot disable agency mode while ${clients} client account${clients === 1 ? "" : "s"} exist.`,
      409,
    );
  }

  const org = await Organization.findById(organizationId);
  if (!org) throw new AgencyError("Organization not found.", 404);
  org.isAgency = false;
  await org.save();
  return org;
}

/** Creates a child client organization under an agency. */
export async function createClientOrganization(input: {
  agencyId: string;
  ownerUserId: string;
  name: string;
  clientLabel?: string;
  defaultCurrency?: string;
}) {
  if (!mongoose.isValidObjectId(input.agencyId)) {
    throw new AgencyError("Invalid agency.", 400);
  }

  const agency = await Organization.findById(input.agencyId);
  if (!agency) throw new AgencyError("Agency not found.", 404);
  if (!agency.isAgency) {
    throw new AgencyError(
      "Enable agency mode on this organization first.",
      409,
    );
  }
  if (agency.parentAgencyId) {
    throw new AgencyError(
      "Client organizations cannot create further clients.",
      409,
    );
  }

  if (!input.name || input.name.trim().length < 2) {
    throw new AgencyError("Client name is required.", 400);
  }

  const slugBase =
    input.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 55) || "client";

  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const mongoSession = await mongoose.startSession();
  let created:
    | {
        _id: mongoose.Types.ObjectId;
        name: string;
        slug: string;
        defaultCurrency: string;
      }
    | undefined;

  try {
    await mongoSession.withTransaction(async () => {
      const [org] = await Organization.create(
        [
          {
            name: input.name.trim(),
            slug,
            type: agency.type,
            ownerId: new mongoose.Types.ObjectId(input.ownerUserId),
            parentAgencyId: agency._id,
            clientLabel: input.clientLabel?.trim() || input.name.trim(),
            defaultCurrency:
              input.defaultCurrency?.toUpperCase() ||
              agency.defaultCurrency ||
              "USD",
            isAgency: false,
          },
        ],
        { session: mongoSession },
      );

      await Membership.create(
        [
          {
            organizationId: org._id,
            userId: new mongoose.Types.ObjectId(input.ownerUserId),
            role: "owner",
            joinedAt: new Date(),
          },
        ],
        { session: mongoSession },
      );

      created = {
        _id: org._id,
        name: org.name,
        slug: org.slug,
        defaultCurrency: org.defaultCurrency,
      };
    });
  } finally {
    await mongoSession.endSession();
  }

  if (!created) {
    throw new AgencyError("Client creation did not complete.", 500);
  }

  return created;
}

/** Lists child organizations of an agency with basic stats. */
export async function listClientOrganizations(agencyId: string) {
  const clients = await Organization.find({ parentAgencyId: agencyId })
    .sort({ createdAt: -1 })
    .lean();

  const clientIds = clients.map((c) => c._id);

  const [campaignCounts, activeCampaigns] = await Promise.all([
    Campaign.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { organizationId: { $in: clientIds } } },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ]),
    Campaign.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      {
        $match: {
          organizationId: { $in: clientIds },
          status: "active",
        },
      },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ]),
  ]);

  const totalMap = new Map(
    campaignCounts.map((c) => [c._id.toString(), c.count]),
  );
  const activeMap = new Map(
    activeCampaigns.map((c) => [c._id.toString(), c.count]),
  );

  return clients.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    clientLabel: c.clientLabel ?? c.name,
    defaultCurrency: c.defaultCurrency,
    isSuspended: c.isSuspended,
    createdAt: c.createdAt,
    stats: {
      totalCampaigns: totalMap.get(c._id.toString()) ?? 0,
      activeCampaigns: activeMap.get(c._id.toString()) ?? 0,
    },
  }));
}

/** Agency's aggregate view across all clients. */
export async function getAgencyOverview(agencyId: string) {
  const [clients, agency] = await Promise.all([
    Organization.find({ parentAgencyId: agencyId }).select("_id name").lean(),
    Organization.findById(agencyId).select("name isAgency").lean(),
  ]);

  if (!agency) throw new AgencyError("Agency not found.", 404);

  const clientIds = clients.map((c) => c._id);

  const [
    totalCampaigns,
    activeCampaigns,
    totalBudgetAgg,
    totalSpendAgg,
  ] = await Promise.all([
    Campaign.countDocuments({ organizationId: { $in: clientIds } }),
    Campaign.countDocuments({
      organizationId: { $in: clientIds },
      status: "active",
    }),
    Campaign.aggregate<{ _id: string; total: number }>([
      { $match: { organizationId: { $in: clientIds } } },
      { $group: { _id: "$currency", total: { $sum: "$budget" } } },
    ]),
    Campaign.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          organizationId: { $in: clientIds },
          status: { $in: ["active", "paused", "completed"] },
        },
      },
      { $group: { _id: "$currency", total: { $sum: "$budget" } } },
    ]),
  ]);

  return {
    agency: { _id: agencyId, name: agency.name },
    clientCount: clients.length,
    totalCampaigns,
    activeCampaigns,
    totalBudgetByCurrency: Object.fromEntries(
      totalBudgetAgg.map((r) => [r._id, Number(r.total.toFixed(2))]),
    ),
    committedByCurrency: Object.fromEntries(
      totalSpendAgg.map((r) => [r._id, Number(r.total.toFixed(2))]),
    ),
    clients: clients.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
    })),
  };
}

/**
 * Checks whether a user can act on a client organization — either
 * directly (as a member) or because they belong to the parent agency.
 */
export async function canAccessClient(input: {
  userId: string;
  organizationId: string;
}) {
  const org = await Organization.findById(input.organizationId)
    .select("_id parentAgencyId ownerId isSuspended")
    .lean();
  if (!org) return { allowed: false, reason: "not_found" as const };

  // Direct owner.
  if (org.ownerId.toString() === input.userId) {
    return { allowed: true, role: "owner" as const, organization: org };
  }

  // Direct member.
  const membership = await Membership.findOne({
    organizationId: org._id,
    userId: new mongoose.Types.ObjectId(input.userId),
  })
    .select("role")
    .lean();
  if (membership) {
    return {
      allowed: true,
      role: membership.role,
      organization: org,
    };
  }

  // Agency parent.
  if (org.parentAgencyId) {
    const agency = await Organization.findById(org.parentAgencyId)
      .select("_id ownerId")
      .lean();
    if (agency) {
      const isAgencyOwner = agency.ownerId.toString() === input.userId;
      const agencyMembership = await Membership.findOne({
        organizationId: agency._id,
        userId: new mongoose.Types.ObjectId(input.userId),
        role: { $in: ["owner", "admin", "manager"] },
      })
        .select("role")
        .lean();

      if (isAgencyOwner || agencyMembership) {
        return {
          allowed: true,
          role: "agency" as const,
          organization: org,
          viaAgency: agency._id.toString(),
        };
      }
    }
  }

  return { allowed: false, reason: "forbidden" as const };
}

void User;
