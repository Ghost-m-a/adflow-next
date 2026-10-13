import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import Organization from "@/models/Organization";
import Membership from "@/models/Membership";
import OrganizationInvitation from "@/models/OrganizationInvitation";
import Campaign from "@/models/Campaign";

type Context = { params: Promise<{ organizationId: string }> };

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number(error.statusCode)
    : 500;
}

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    const { organizationId } = await ctx.params;
    if (!mongoose.isValidObjectId(organizationId)) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const session = await requireSession();
    await connectToDatabase();

    const org = await Organization.findById(organizationId).lean();
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    let role: string = "member";
    if (org.ownerId.toString() === session.userId) {
      role = "owner";
    } else {
      const m = await Membership.findOne({
        organizationId: org._id,
        userId: new mongoose.Types.ObjectId(session.userId),
      }).lean();
      if (!m) {
        return NextResponse.json(
          { error: "You are not a member of this organization." },
          { status: 403 },
        );
      }
      role = m.role;
    }

    return NextResponse.json({
      organization: {
        ...org,
        _id: org._id.toString(),
        ownerId: org.ownerId.toString(),
        role,
      },
    });
  } catch (error) {
    const status = statusOf(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load organization." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Context) {
  try {
    const { organizationId } = await ctx.params;
    if (!mongoose.isValidObjectId(organizationId)) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    if (typeof input.name === "string") {
      const name = input.name.trim();
      if (!name || name.length > 120) {
        return NextResponse.json({ error: "Name is required and must be at most 120 characters." }, { status: 400 });
      }
      update.name = name;
    }

    if (typeof input.description === "string") {
      const d = input.description.trim();
      if (d.length > 2000) {
        return NextResponse.json({ error: "Description must be at most 2000 characters." }, { status: 400 });
      }
      update.description = d || undefined;
    }

    if (typeof input.website === "string") {
      const w = input.website.trim();
      if (w && (w.length > 2048 || !/^https?:\/\/\S+$/i.test(w))) {
        return NextResponse.json({ error: "Website must be a valid HTTP/HTTPS URL." }, { status: 400 });
      }
      update.website = w || undefined;
    }

    if (typeof input.defaultCurrency === "string") {
      const c = input.defaultCurrency.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) {
        return NextResponse.json({ error: "Currency must be a three-letter code." }, { status: 400 });
      }
      update.defaultCurrency = c;
    }

    if (typeof input.type === "string") {
      if (input.type !== "advertiser" && input.type !== "agency") {
        return NextResponse.json({ error: "Type must be advertiser or agency." }, { status: 400 });
      }
      update.type = input.type;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No changes provided." }, { status: 400 });
    }

    const org = await Organization.findByIdAndUpdate(
      organizationId,
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        ...org,
        _id: org._id.toString(),
        ownerId: org.ownerId.toString(),
      },
    });
  } catch (error) {
    const status = statusOf(error);
    if ([401, 403, 404].includes(status)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Access denied." },
        { status },
      );
    }
    console.error("PATCH organization:", error);
    return NextResponse.json({ error: "Unable to update organization." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  try {
    const { organizationId } = await ctx.params;
    if (!mongoose.isValidObjectId(organizationId)) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    // Deletion is owner-only.
    await requireOrganizationRole(organizationId, ["owner"]);
    await connectToDatabase();

    const campaignCount = await Campaign.countDocuments({ organizationId });
    if (campaignCount > 0) {
      return NextResponse.json(
        {
          error: `This organization owns ${campaignCount} campaign${campaignCount === 1 ? "" : "s"}. Archive or delete them before deleting the organization.`,
        },
        { status: 409 },
      );
    }

    await Promise.all([
      Membership.deleteMany({ organizationId }),
      OrganizationInvitation.deleteMany({ organizationId }),
    ]);

    const deleted = await Organization.findByIdAndDelete(organizationId);
    if (!deleted) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const status = statusOf(error);
    if ([401, 403, 404].includes(status)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Access denied." },
        { status },
      );
    }
    console.error("DELETE organization:", error);
    return NextResponse.json({ error: "Unable to delete organization." }, { status: 500 });
  }
}
