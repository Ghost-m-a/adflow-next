import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import {
  ApiKeyError,
  createApiKey,
  listApiKeys,
} from "@/services/api-key.service";
import { API_SCOPES, type ApiScope } from "@/models/ApiKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const organizationId = req.nextUrl.searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }
    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    const keys = await listApiKeys(organizationId);
    return NextResponse.json({ keys, availableScopes: API_SCOPES });
  } catch (error) {
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: s >= 400 && s < 600 ? s : 500 },
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
    const organizationId = b.organizationId;
    const name = b.name;
    const scopes = b.scopes;

    if (typeof organizationId !== "string") {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }
    if (typeof name !== "string") {
      return NextResponse.json({ error: "name required." }, { status: 400 });
    }
    if (!Array.isArray(scopes)) {
      return NextResponse.json({ error: "scopes must be an array." }, { status: 400 });
    }

    const invalid = scopes.filter((s) => !API_SCOPES.includes(s as never));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);

    const result = await createApiKey({
      organizationId,
      userId: session.userId,
      name,
      scopes: scopes as ApiScope[],
    });

    return NextResponse.json(
      {
        key: result.key, // Show once.
        record: result.record,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}
