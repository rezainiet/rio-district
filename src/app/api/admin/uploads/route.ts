import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { adminRoute, errorJson, json } from "@/lib/http";
import { log } from "@/lib/log";
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from "@/lib/uploads";

const MAX_BYTES = 5 * 1024 * 1024;

/** Identifies the image type from its magic bytes (never trust the file name or MIME). */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp" && /avi[fs]/.test(buf.toString("ascii", 8, 12))) return "avif";
  return null;
}

/**
 * Stores uploads in UPLOAD_DIR (persistent, outside the release directory).
 * Fine for a single VPS; for several servers or serverless hosting, replace
 * with object storage (S3, R2, Cloudinary).
 */
export const POST = adminRoute(async (req, _ctx, admin) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return errorJson(400, "Aucun fichier reçu.");
  if (file.size > MAX_BYTES) return errorJson(413, "Image trop lourde (5 Mo max).");

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return errorJson(415, "Format non pris en charge (JPG, PNG, WebP, AVIF).");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  log.info("upload.created", { file: name, bytes: buf.length, by: admin.email });
  return json({ ok: true, url: `${UPLOAD_URL_PREFIX}/${name}` }, 201);
});
