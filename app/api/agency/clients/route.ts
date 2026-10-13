import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import Organization from "@/models/Organization";
import {
  AgencyError,
  createClientOrganization,
  listClientOrganizations,
} from "@/services/agency.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const agencyId = req.nextUrl.searchParams.get("agencyId");
    if (!agencyId) {
      return NextResponse.json({ error: "agencyId required." }, { status: 400 });
    }

    await connectToDatabase();
    const agency = await Organization.findById(agencyId).select("ownerId").lean();
    if (!agency) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }
    if (agency.ownerId.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const clients = await listClientOrganizations(agencyId);
    return NextResponse.json({ clients });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const agencyId = b.agencyId;
    const name = b.name;
    const clientLabel = b.clientLabel;
    const defaultCurrency = b.defaultCurrency;

    if (typeof agencyId !== "string") {
      return NextResponse.json({ error: "agencyId required." }, { status: 400 });
    }
    if (typeof name !== "string") {
      return NextResponse.json({ error: "name required." }, { status: 400 });
    }

    const agency = await Organization.findById(agencyId).select("ownerId").lean();
    if (!agency || agency.ownerId.toString() !== session.userId) {
      return NextResponse.json({ error: "Owner access required." }, { status: 403 });
    }

    const client = await createClientOrganization({
      agencyId,
      ownerUserId: session.userId,
      name,
      clientLabel: typeof clientLabel === "string" ? clientLabel : undefined,
      defaultCurrency:
        typeof defaultCurrency === "string" ? defaultCurrency : undefined,
    });

    return NextResponse.json(
      {
        client: {
          _id: client._id.toString(),
          name: client.name,
          slug: client.slug,
          defaultCurrency: client.defaultCurrency,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AgencyError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Create client:", error);
    return NextResponse.json({ error: "Unable to create client." }, { status: 500 });
  }
}
