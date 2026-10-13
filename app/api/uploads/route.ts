import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/requireSession";
import { UploadError, uploadFile } from "@/services/upload.service";
import type { UploadKind } from "@/lib/storage/provider";

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

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const form = await req.formData();
    const kindRaw = form.get("kind");
    const file = form.get("file");

    if (typeof kindRaw !== "string" || !KINDS.includes(kindRaw as UploadKind)) {
      return NextResponse.json(
        { error: "Valid kind is required." },
        { status: 400 },
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const stored = await uploadFile({
      file,
      kind: kindRaw as UploadKind,
    });

    return NextResponse.json(
      {
        upload: {
          url: stored.url,
          key: stored.key,
          size: stored.size,
          contentType: stored.contentType,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Unable to upload file." },
      { status: 500 },
    );
  }
}
