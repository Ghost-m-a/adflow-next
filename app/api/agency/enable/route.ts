import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Organization from "@/models/Organization";
import {
  AgencyError,
  enableAgencyMode,
} from "@/services/agency.service";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => null);
    const organizationId = (body as { organizationId?: string } | null)
      ?.organizationId;

    if (typeof organizationId !== "string") {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }

    await connectToDatabase();
    const org = await Organization.findById(organizationId).select("ownerId").lean();
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    if (org.ownerId.toString() !== session.userId) {
      return NextResponse.json({ error: "Owner access required." }, { status: 403 });
    }

    const updated = await enableAgencyMode(organizationId);
    return NextResponse.json({
      organization: {
        _id: updated._id.toString(),
        isAgency: updated.isAgency,
      },
    });
  } catch (error) {
    if (error instanceof AgencyError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Enable agency:", error);
    return NextResponse.json({ error: "Unable to enable." }, { status: 500 });
  }
}
