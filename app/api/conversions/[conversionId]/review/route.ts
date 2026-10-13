import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/auth/requireOrganizationRole";
import { ORGANIZATION_PERMISSIONS } from "@/lib/permissions/roles";
import Conversion from "@/models/Conversion";
import {
  approveConversion,
  rejectConversion,
} from "@/services/conversion.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ conversionId: string }> };

export async function PATCH(request: NextRequest, ctx: Context) {
  try {
    const session = await requireSession();
    const { conversionId } = await ctx.params;

    if (!mongoose.isValidObjectId(conversionId)) {
      return NextResponse.json({ error: "Invalid conversion." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const action = (body as Record<string, unknown>).action;
    const reason = (body as Record<string, unknown>).reason;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject".' },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const conversion = await Conversion.findById(conversionId).lean();
    if (!conversion) {
      return NextResponse.json({ error: "Conversion not found." }, { status: 404 });
    }

    await requireOrganizationRole(
      conversion.advertiserOrganizationId.toString(),
      ORGANIZATION_PERMISSIONS.manageCampaigns,
    );

    const updated =
      action === "approve"
        ? await approveConversion(conversionId, session.userId)
        : await rejectConversion(
            conversionId,
            session.userId,
            typeof reason === "string" ? reason : undefined,
          );

    return NextResponse.json({
      conversion: {
        _id: updated._id.toString(),
        status: updated.status,
        approvedAt: updated.approvedAt ?? null,
        rejectedAt: updated.rejectedAt ?? null,
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if ([400, 401, 403, 404, 409].includes(status)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request denied." },
        { status },
      );
    }
    console.error("PATCH conversion review:", error);
    return NextResponse.json({ error: "Unable to review conversion." }, { status: 500 });
  }
}
