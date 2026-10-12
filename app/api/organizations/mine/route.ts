import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Membership from "@/models/Membership";
import Organization from "@/models/Organization";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const userId = new mongoose.Types.ObjectId(session.userId);

    const [owned, memberships] = await Promise.all([
      Organization.find({ ownerId: userId, isSuspended: false })
        .select("_id name slug type defaultCurrency ownerId")
        .lean(),
      Membership.find({ userId })
        .select("organizationId role")
        .lean(),
    ]);

    const roles = new Map<string, string>();
    for (const org of owned) roles.set(org._id.toString(), "owner");
    for (const membership of memberships) {
      if (!roles.has(membership.organizationId.toString())) {
        roles.set(membership.organizationId.toString(), membership.role);
      }
    }

    const ids = [...roles.keys()];
    const organizations = ids.length
      ? await Organization.find({
          _id: { $in: ids },
          isSuspended: false,
        })
          .select("_id name slug type defaultCurrency")
          .sort({ name: 1 })
          .lean()
      : [];

    return NextResponse.json({
      organizations: organizations.map((org) => ({
        ...org,
        _id: org._id.toString(),
        role: roles.get(org._id.toString()) ?? "member",
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;

    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }

    console.error("GET /api/organizations/mine:", error);
    return NextResponse.json(
      { error: "Unable to load organizations." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
