import "server-only";
import path from "node:path";

/**
 * Admin uploads live OUTSIDE the release directory so they survive redeploys.
 * Production: set UPLOAD_DIR to a persistent path (e.g. /var/lib/kalt/uploads).
 * Development default: .data/uploads (git-ignored).
 */
export const UPLOAD_DIR = path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads");

/** Public URL prefix; files are streamed by src/app/uploads/[file]/route.ts. */
export const UPLOAD_URL_PREFIX = "/uploads";

/** Names produced by the upload route: <base36 time>-<12 hex>.<ext>. */
export const UPLOAD_NAME = /^[a-z0-9]{6,12}-[a-f0-9]{12}\.(jpg|png|webp|avif)$/;

export const UPLOAD_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};
