import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import Membership from "@/models/Membership";
import Organization from "@/models/Organization";

type Context = {
  params: Promise<{ organizationId: string; userId: string }>;
};

const ASSIGNABLE_ROLES = ["admin", "manager", "member", "viewer"] as const;

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number(error.statusCode)
    : 500;
}

export async function PATCH(req: NextRequest, ctx: Context) {
  try {
    const { organizationId, userId } = await ctx.params;
    if (
      !mongoose.isValidObjectId(organizationId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }

    const access = await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const requestedRole = (body as Record<string, unknown>).role;
    if (
      typeof requestedRole !== "string" ||
      !ASSIGNABLE_ROLES.includes(requestedRole as (typeof ASSIGNABLE_ROLES)[number])
    ) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    // Only owners can grant admin.
    if (requestedRole === "admin" && access.role !== "owner") {
      return NextResponse.json(
        { error: "Only the organization owner can grant the admin role." },
        { status: 403 },
      );
    }

    const org = await Organization.findById(organizationId).select("ownerId").lean();
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    if (org.ownerId.toString() === userId) {
      return NextResponse.json(
        { error: "The organization owner's role cannot be changed." },
        { status: 409 },
      );
    }

    const updated = await Membership.findOneAndUpdate(
      { organizationId, userId: new mongoose.Types.ObjectId(userId) },
      { $set: { role: requestedRole } },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    return NextResponse.json({
      member: {
        _id: updated._id.toString(),
        userId: updated.userId.toString(),
        role: updated.role,
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
    console.error("PATCH member role:", error);
    return NextResponse.json({ error: "Unable to update member." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  try {
    const { organizationId, userId } = await ctx.params;
    if (
      !mongoose.isValidObjectId(organizationId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    const org = await Organization.findById(organizationId).select("ownerId").lean();
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    if (org.ownerId.toString() === userId) {
      return NextResponse.json(
        { error: "The organization owner cannot be removed. Transfer ownership or delete the organization instead." },
        { status: 409 },
      );
    }

    const removed = await Membership.findOneAndDelete({
      organizationId,
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!removed) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
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
    console.error("DELETE member:", error);
    return NextResponse.json({ error: "Unable to remove member." }, { status: 500 });
  }
}
