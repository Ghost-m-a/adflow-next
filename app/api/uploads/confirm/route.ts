import { NextRequest, NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

import { requireSession } from "@/lib/auth/requireSession";
import { getBucketName, getS3Client, buildPublicUrl } from "@/lib/storage/s3-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the client after a direct-to-S3 upload completes.
 * Verifies the object exists and returns the metadata.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const body = await req.json().catch(() => null);
    const key = (body as { key?: string } | null)?.key;

    if (typeof key !== "string" || !key || key.includes("..")) {
      return NextResponse.json({ error: "Valid key required." }, { status: 400 });
    }

    const head = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      }),
    );

    if (!head.ContentLength) {
      return NextResponse.json(
        { error: "Upload verification failed." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      upload: {
        key,
        url: buildPublicUrl(key),
        size: head.ContentLength,
        contentType: head.ContentType ?? "application/octet-stream",
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }
    // S3 NotFound becomes a 422 — the client uploaded but the object
    // isn't visible yet (rare race with eventual consistency on some providers).
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error.name === "NotFound" || error.name === "NoSuchKey")
    ) {
      return NextResponse.json(
        { error: "Uploaded object not found." },
        { status: 422 },
      );
    }
    console.error("Confirm upload failed:", error);
    return NextResponse.json(
      { error: "Unable to confirm upload." },
      { status: 500 },
    );
  }
}
