/**
 * Shared, idempotent import of the reference-store reviews
 * (scripts/data/reference-reviews.json) into any database.
 *
 * Rules:
 *  - nothing is invented: no date, no colour, no "Achat vérifié";
 *  - a review is identified by its importKey, so re-running never duplicates;
 *    the 6 reviews seeded earlier (same author + text) are linked, not copied;
 *  - imported reviews are PENDING and UNPUBLISHED unless the manifest records a
 *    written client confirmation AND the review is individually approved;
 *  - photos are downloaded only when the manifest says they are authorized;
 *  - existing reviews are never unpublished, overwritten or deleted.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "mongodb";

export type ManifestReview = {
  key: string;
  position: number;
  author: string;
  rating: number;
  text: string;
  model: string;
  date: string | null;
  photoSource: string | null;
  approved: boolean;
};

export type Manifest = {
  source: { url: string; capturedAt: string; count: number };
  authorization: {
    status: "pending" | "confirmed" | "refused";
    reviewsAreGenuine: boolean | null;
    reuseAuthorized: boolean | null;
    photosAuthorized: boolean | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    evidence: string | null;
  };
  reviews: ManifestReview[];
};

export const MANIFEST_PATH = path.resolve("scripts/data/reference-reviews.json");

export function loadManifest(file = MANIFEST_PATH): Manifest {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Publication needs a complete written confirmation, not just a flag. */
export function canPublish(m: Manifest) {
  const a = m.authorization;
  return a.status === "confirmed" && a.reviewsAreGenuine === true && a.reuseAuthorized === true && Boolean(a.confirmedBy && a.confirmedAt && a.evidence);
}

export function canUsePhotos(m: Manifest) {
  return canPublish(m) && m.authorization.photosAuthorized === true;
}

const SOURCE_NOTE = "Boutique de référence kaltshop.club — authenticité et autorisation de réutilisation à confirmer par le client";

export type ImportCounts = {
  total: number;
  inserted: number;
  linked: number;
  unchanged: number;
  published: number;
  photosStored: number;
  photosAwaitingAuthorization: number;
};

export async function importReferenceReviews(
  db: Db,
  m: Manifest,
  opts: { apply: boolean; publishApproved?: boolean; withPhotos?: boolean; uploadDir?: string; migration?: string },
): Promise<ImportCounts> {
  const col = db.collection("testimonials");
  const counts: ImportCounts = { total: m.reviews.length, inserted: 0, linked: 0, unchanged: 0, published: 0, photosStored: 0, photosAwaitingAuthorization: 0 };
  const publishAllowed = Boolean(opts.publishApproved) && canPublish(m);
  const photosAllowed = Boolean(opts.withPhotos) && canUsePhotos(m);
  const capturedAt = new Date(m.source.capturedAt);
  const now = new Date();

  if (opts.apply) {
    await col.createIndex({ importKey: 1 }, { unique: true, partialFilterExpression: { importKey: { $type: "string" } } });
  }

  for (const r of m.reviews) {
    const provenance = { origin: "kaltshop.club", url: m.source.url, capturedAt, originalPhoto: r.photoSource ?? "" };
    let doc = await col.findOne({ importKey: r.key });
    if (!doc) {
      // Seeded earlier without a key: same author and text → link it.
      const legacy = await col.findOne({ importKey: { $exists: false }, author: r.author, text: r.text });
      if (legacy) {
        counts.linked++;
        if (opts.apply) {
          await col.updateOne(
            { _id: legacy._id },
            { $set: { importKey: r.key, group: r.model, submittedBy: "import", provenance, source: SOURCE_NOTE, rating: r.rating, sortOrder: r.position } },
          );
        }
        doc = { ...legacy, importKey: r.key };
      } else {
        counts.inserted++;
        if (opts.apply) {
          const res = await col.insertOne({
            author: r.author,
            title: "",
            text: r.text,
            rating: r.rating,
            verified: false, // no purchase record exists for these reviews
            published: false,
            status: "pending",
            source: SOURCE_NOTE,
            submittedBy: "import",
            product: null,
            group: r.model,
            reviewedAt: r.date ? new Date(r.date) : null,
            importKey: r.key,
            provenance,
            email: "",
            order: null,
            orderNumber: "",
            photos: [],
            moderatedAt: null,
            moderatedBy: "",
            sortOrder: r.position,
            createdAt: now,
            updatedAt: now,
            ...(opts.migration ? { migration: opts.migration } : {}),
          });
          doc = await col.findOne({ _id: res.insertedId });
        }
      }
    } else {
      counts.unchanged++;
    }

    // Photos: only with written authorization, and only if the review has none yet.
    if (r.photoSource) {
      if (!photosAllowed) counts.photosAwaitingAuthorization++;
      else if (doc && !(doc.photos?.length)) {
        counts.photosStored++;
        if (opts.apply) {
          const url = await storeRemotePhoto(r.photoSource, opts.uploadDir);
          await col.updateOne({ _id: doc._id }, { $set: { photos: [url] } });
        }
      }
    }

    // Publication: only individually approved reviews, with a complete written confirmation.
    if (publishAllowed && r.approved && doc && !doc.published && doc.status !== "rejected") {
      counts.published++;
      if (opts.apply) {
        const a = m.authorization;
        await col.updateOne(
          { _id: doc._id },
          { $set: { status: "approved", published: true, moderatedAt: now, moderatedBy: `migration — confirmation écrite de ${a.confirmedBy} (${a.confirmedAt})` } },
        );
      }
    }
  }
  return counts;
}

/** Downloads an authorized photo and stores it like a customer upload (re-encoded, no metadata). */
async function storeRemotePhoto(source: string, uploadDir = process.env.UPLOAD_DIR || ".data/uploads") {
  const res = await fetch(source);
  if (!res.ok) throw new Error(`Photo introuvable (${res.status}) : ${source}`);
  const sharp = (await import("sharp")).default;
  const out = await sharp(Buffer.from(await res.arrayBuffer()), { failOn: "error" })
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const dir = path.resolve(uploadDir, "reviews");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.webp`;
  await writeFile(path.join(dir, name), out);
  return `/uploads/reviews/${name}`;
}

export function manifestChecksum(file = MANIFEST_PATH) {
  return createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
}
