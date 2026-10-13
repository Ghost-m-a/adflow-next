import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type UploadKind =
  | "campaign-cover"
  | "campaign-logo"
  | "reference-material"
  | "submission-thumbnail"
  | "avatar"
  | "other";

export type StoredFile = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

export interface UploadProvider {
  name: string;
  /** Persist a file and return its public URL. */
  put(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredFile>;
  /** Best-effort delete. Never throws. */
  remove(key: string): Promise<void>;
}

/* ----------------------------------------------------------
   Local provider — writes to public/uploads.
   Intended for development only. Not for production.
---------------------------------------------------------- */

function localDir(): string {
  return process.env.UPLOAD_LOCAL_DIR || "public/uploads";
}

class LocalProvider implements UploadProvider {
  name = "local";

  async put(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredFile> {
    const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), localDir());
    const full = path.join(/* turbopackIgnore: true */ root, input.key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.body);

    // public/ is served at the root by Next.js.
    const url = `/${localDir().replace(/^public\//, "")}/${input.key}`;
    return {
      key: input.key,
      url,
      size: input.body.length,
      contentType: input.contentType,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      const full = path.resolve(/* turbopackIgnore: true */ process.cwd(), localDir(), key);
      await fs.unlink(full);
    } catch {
      // Ignore.
    }
  }
}

/* ----------------------------------------------------------
   S3 / R2 provider — uses AWS SDK v3 raw fetch to avoid
   adding a dependency. Only works with AWS SigV4 signing,
   which is what both S3 and R2 accept.
---------------------------------------------------------- */

class S3Provider implements UploadProvider {
  name = "s3";

  async put(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredFile> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getS3Client, getBucketName, buildPublicUrl } = await import(
      "./s3-client"
    );

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      key: input.key,
      url: buildPublicUrl(input.key),
      size: input.body.length,
      contentType: input.contentType,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const { getS3Client, getBucketName } = await import("./s3-client");

      await getS3Client().send(
        new DeleteObjectCommand({
          Bucket: getBucketName(),
          Key: key,
        }),
      );
    } catch {
      // Best-effort — never throws.
    }
  }
}

export function getUploadProvider(): UploadProvider {
  const name = (process.env.UPLOAD_PROVIDER || "local").toLowerCase();
  if (name === "s3") return new S3Provider();
  return new LocalProvider();
}

/* ----------------------------------------------------------
   Shared helpers
---------------------------------------------------------- */

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/zip",
] as const;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export function isAllowedContentType(kind: UploadKind, type: string): boolean {
  if (kind === "reference-material") {
    return (
      (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type) ||
      (ALLOWED_DOC_TYPES as readonly string[]).includes(type)
    );
  }
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

/** Generates a namespaced key like `campaign-cover/abcd1234.jpg`. */
export function buildKey(kind: UploadKind, contentType: string): string {
  const ext = extensionFor(contentType);
  const rand = randomBytes(10).toString("hex");
  const date = new Date().toISOString().slice(0, 10);
  return `${kind}/${date}/${rand}.${ext}`;
}

function extensionFor(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/zip": "zip",
  };
  return map[contentType] ?? "bin";
}
