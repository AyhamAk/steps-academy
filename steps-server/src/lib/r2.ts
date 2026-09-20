import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env";

export const r2 = new S3Client({
  region: "auto",
  endpoint: env.r2.endpoint,
  credentials: {
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  },
  // R2 doesn't support the AWS SDK v3's default flexible-checksum streaming
  // trailers on PutObject — without this, uploads get silently truncated.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.r2.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** Photos are private — every read goes through a short-lived signed URL, never a public bucket. */
export async function getSignedGetUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.r2.bucketName, Key: key });
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}

/**
 * Removes objects from the bucket, ignoring any that are already gone.
 *
 * Deleting a photo, an album or a child used to remove the database rows and
 * leave the JPEGs behind forever — nothing referenced them again, and the
 * bucket kept billing for them. Callers pass the three keys every photo has
 * (original, thumb, medium); nulls and dev-seed rows with an `externalUrl`
 * and no key are filtered out here so no call site has to remember.
 */
export async function deleteObjects(keys: (string | null | undefined)[]): Promise<void> {
  const real = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  if (real.length === 0) return;

  // S3 caps a batch delete at 1000 keys.
  for (let i = 0; i < real.length; i += 1000) {
    const batch = real.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: env.r2.bucketName,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      })
    );
  }
}
