import { randomUUID } from "crypto";
import sharp from "sharp";

import { uploadObject } from "./r2";

export type UploadedImageKeys = {
  key: string;
  thumbKey: string;
  mediumKey: string;
};

/**
 * Generates a thumbnail (~200px) and medium (~800px) version alongside the
 * original, uploads all three to R2, and returns their object keys. Phones
 * routinely produce 5-8MB photos — nothing should ever serve those directly
 * to a gallery grid or notification thumbnail.
 */
export async function processAndUploadImage(
  eventId: string,
  buffer: Buffer,
  originalMimeType: string
): Promise<UploadedImageKeys> {
  const id = randomUUID();
  const base = `events/${eventId}/${id}`;
  const originalExt = originalMimeType === "image/png" ? ".png" : ".jpg";

  const [thumbBuffer, mediumBuffer] = await Promise.all([
    sharp(buffer).rotate().resize(200, 200, { fit: "cover" }).jpeg({ quality: 70 }).toBuffer(),
    sharp(buffer)
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer(),
  ]);

  const key = `${base}-original${originalExt}`;
  const thumbKey = `${base}-thumb.jpg`;
  const mediumKey = `${base}-medium.jpg`;

  await Promise.all([
    uploadObject(key, buffer, originalMimeType),
    uploadObject(thumbKey, thumbBuffer, "image/jpeg"),
    uploadObject(mediumKey, mediumBuffer, "image/jpeg"),
  ]);

  return { key, thumbKey, mediumKey };
}
