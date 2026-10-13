import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getBucketName, getS3Client } from "./s3-client";

/** Presigned PUT URLs expire after 5 minutes — plenty for a single upload. */
const PRESIGN_TTL_SECONDS = 5 * 60;

/**
 * Returns a presigned PUT URL the browser can use to upload a file
 * directly to S3 without routing bytes through the Next.js server.
 *
 * The caller must:
 *   - send `Content-Type` exactly matching the presigned value
 *   - send `Content-Length` (browsers do this automatically)
 *   - upload to exactly the URL returned
 */
export async function presignPut(input: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    // Prevent accidental metadata leakage from uploads.
    Metadata: {
      uploadedAt: new Date().toISOString(),
    },
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGN_TTL_SECONDS,
  });
}
