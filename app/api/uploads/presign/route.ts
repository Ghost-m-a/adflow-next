import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/requireSession";
import {
  buildKey,
  isAllowedContentType,
  MAX_UPLOAD_BYTES,
  type UploadKind,
} from "@/lib/storage/provider";
import { presignPut } from "@/lib/storage/presign";
import { buildPublicUrl } from "@/lib/storage/s3-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: UploadKind[] = [
  "campaign-cover",
  "campaign-logo",
  "reference-material",
  "submission-thumbnail",
  "avatar",
  "other",
];

/**
 * Returns a presigned PUT URL. Only available when UPLOAD_PROVIDER=s3.
 * The client uploads directly to S3, then calls /api/uploads/confirm.
 */
export async function POST(req: NextRequest) {
  try {
    // Presigned flow requires S3 to be configured.
    if ((process.env.UPLOAD_PROVIDER || "local").toLowerCase() !== "s3") {
      return NextResponse.json(
        {
          error: "Presigned uploads are not enabled.",
          fallbackEndpoint: "/api/uploads",
        },
        { status: 503 },
      );
    }

    await requireSession();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const kind = b.kind;
    const contentType = b.contentType;
    const size = b.size;

    if (typeof kind !== "string" || !KINDS.includes(kind as UploadKind)) {
      return NextResponse.json({ error: "Valid kind required." }, { status: 400 });
    }
    if (typeof contentType !== "string") {
      return NextResponse.json(
        { error: "contentType required." },
        { status: 400 },
      );
    }
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Valid size required." }, { status: 400 });
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `File too large (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB).`,
        },
        { status: 413 },
      );
    }
    if (!isAllowedContentType(kind as UploadKind, contentType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}.` },
        { status: 415 },
      );
    }

    const key = buildKey(kind as UploadKind, contentType);

    const uploadUrl = await presignPut({
      key,
      contentType,
      contentLength: size,
    });

    return NextResponse.json({
      mode: "presigned",
      uploadUrl,
      key,
      publicUrl: buildPublicUrl(key),
      expiresIn: 300,
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }
    console.error("Presign failed:", error);
    return NextResponse.json(
      { error: "Unable to presign upload." },
      { status: 500 },
    );
  }
}
