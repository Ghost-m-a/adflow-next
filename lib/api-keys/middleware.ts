import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ApiKeyError, hasScope, verifyApiKey } from "@/services/api-key.service";
import type { ApiScope } from "@/models/ApiKey";

export type AuthedApiRequest = {
  organizationId: string;
  scopes: ApiScope[];
  keyId: string;
};

/**
 * Guard for public API routes. Verifies the X-API-Key header and
 * checks that the key has the required scope. Returns either an error
 * Response or the authenticated context.
 */
export async function requireApiKey(
  req: NextRequest,
  requiredScope: ApiScope,
): Promise<AuthedApiRequest | NextResponse> {
  const raw = req.headers.get("x-api-key");
  if (!raw) {
    return NextResponse.json(
      { error: "Missing X-API-Key header." },
      { status: 401 },
    );
  }

  try {
    await connectToDatabase();
    const context = await verifyApiKey(raw);
    if (!hasScope(context.scopes, requiredScope)) {
      return NextResponse.json(
        { error: `Missing required scope: ${requiredScope}` },
        { status: 403 },
      );
    }
    return context;
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("API key verification failed:", error);
    return NextResponse.json(
      { error: "Unable to verify key." },
      { status: 500 },
    );
  }
}
