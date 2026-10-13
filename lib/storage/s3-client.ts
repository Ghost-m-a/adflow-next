import { S3Client } from "@aws-sdk/client-s3";

/**
 * S3-compatible client. Works with both:
 *   - AWS S3 (leave S3_ENDPOINT empty, S3_REGION=us-east-1, FORCE_PATH_STYLE=false)
 *   - Cloudflare R2 (S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com,
 *     S3_REGION=auto, S3_FORCE_PATH_STYLE=true)
 *   - DigitalOcean Spaces, MinIO, Backblaze B2 — anything S3-compatible
 *
 * Lazily instantiated so env vars are read at request time, not module load.
 */
let cached: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cached) return cached;

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured.",
    );
  }

  cached = new S3Client({
    region,
    // Leave endpoint undefined for real AWS S3.
    ...(endpoint ? { endpoint } : {}),
    credentials: { accessKeyId, secretAccessKey },
    // R2 and MinIO need path-style addressing; AWS S3 prefers virtual-hosted.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });

  return cached;
}

export function getBucketName(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET must be configured.");
  return bucket;
}

export function getPublicUrlBase(): string {
  const base = process.env.S3_PUBLIC_URL;
  if (!base) {
    throw new Error(
      "S3_PUBLIC_URL must be configured (the public URL of your bucket).",
    );
  }
  return base.replace(/\/+$/, "");
}

export function buildPublicUrl(key: string): string {
  return `${getPublicUrlBase()}/${key}`;
}
