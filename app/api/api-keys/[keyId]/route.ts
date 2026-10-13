import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { requireOrganizationRole } from "@/lib/permissions/requireOrganizationRole";
import { ApiKeyError, revokeApiKey } from "@/services/api-key.service";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ keyId: string }> },
) {
  try {
    await requireSession();
    const { keyId } = await ctx.params;
    const organizationId = req.nextUrl.searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required." }, { status: 400 });
    }

    await requireOrganizationRole(organizationId, ["owner", "admin"]);
    await connectToDatabase();

    const result = await revokeApiKey(keyId, organizationId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to revoke." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}
