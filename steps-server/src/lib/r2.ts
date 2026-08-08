import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
