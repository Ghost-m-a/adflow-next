import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import Membership from "@/models/Membership";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(_req: Request, ctx: Context) {
  try {
    const { organizationId } = await ctx.params;
    if (!mongoose.isValidObjectId(organizationId)) {
      return NextResponse.json({ error: "Invalid organization ID." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, [
      "owner",
      "admin",
      "manager",
      "member",
      "viewer",
    ]);
    await connectToDatabase();

    const memberships = await Membership.find({ organizationId })
      .populate({
        path: "userId",
        select: "_id name username email avatarUrl",
      })
      .sort({ role: 1, joinedAt: 1 })
      .lean();

    return NextResponse.json({
      members: memberships.map((m) => {
        const u = m.userId as unknown as {
          _id?: mongoose.Types.ObjectId;
          name?: string;
          username?: string;
          email?: string;
          avatarUrl?: string;
        } | null;

        return {
          _id: m._id.toString(),
          userId: u?._id?.toString() ?? "",
          name: u?.name ?? "",
          username: u?.username ?? "",
          email: u?.email ?? "",
          avatarUrl: u?.avatarUrl ?? "",
          role: m.role,
          joinedAt: m.joinedAt,
        };
      }),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load members." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
