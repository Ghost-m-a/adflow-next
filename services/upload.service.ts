import {
  buildKey,
  getUploadProvider,
  isAllowedContentType,
  MAX_UPLOAD_BYTES,
  type UploadKind,
  type StoredFile,
} from "@/lib/storage/provider";

export class UploadError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "UploadError";
    this.statusCode = statusCode;
  }
}

/** Validates, then stores a file uploaded via multipart/form-data. */
export async function uploadFile(input: {
  file: File;
  kind: UploadKind;
}): Promise<StoredFile> {
  if (!input.file || input.file.size === 0) {
    throw new UploadError("Empty file.");
  }
  if (input.file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `File is too large (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB).`,
      413,
    );
  }
  if (!isAllowedContentType(input.kind, input.file.type)) {
    throw new UploadError(
      `Unsupported file type: ${input.file.type}.`,
      415,
    );
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const provider = getUploadProvider();
  const key = buildKey(input.kind, input.file.type);

  return provider.put({
    key,
    body: buffer,
    contentType: input.file.type,
  });
}

/** Best-effort delete of an uploaded file. Never throws. */
export async function removeUploadedFile(key: string): Promise<void> {
  if (!key || key.includes("..")) return;
  const provider = getUploadProvider();
  await provider.remove(key);
}
