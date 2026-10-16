import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UPLOAD_DIR } from "./uploads";

export const REVIEW_PHOTO_DIR = path.join(UPLOAD_DIR, "reviews");
export const REVIEW_PHOTO_PREFIX = "/uploads/reviews";
export const REVIEW_PHOTO_NAME = /^[a-z0-9]{6,12}-[a-f0-9]{12}\.webp$/;
export const MAX_REVIEW_PHOTOS = 3;
export const MAX_REVIEW_PHOTO_BYTES = 6 * 1024 * 1024;

/**
 * Re-encodes a customer photo: decodes it (rejects anything that is not a real
 * image), applies EXIF orientation, resizes to 1600 px max and writes a WebP
 * WITHOUT metadata (no GPS position, no device info).
 */
export async function storeReviewPhoto(input: Buffer) {
  const img = sharp(input, { failOn: "error", limitInputPixels: 40_000_000 });
  const meta = await img.metadata();
  if (!meta.format || !["jpeg", "png", "webp", "heif", "avif"].includes(meta.format)) {
    throw new Error("unsupported");
  }
  const out = await img.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await mkdir(REVIEW_PHOTO_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.webp`;
  await writeFile(path.join(REVIEW_PHOTO_DIR, name), out);
  return `${REVIEW_PHOTO_PREFIX}/${name}`;
}
