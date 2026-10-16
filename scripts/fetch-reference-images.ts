/**
 * Downloads the reference product photographs listed in
 * scripts/data/reference-images.json into public/products/reference/.
 *
 * Refuses to run unless the manifest records at least a verbal confirmation
 * (authorization.verbalConfirmation) or a written authorization, AND the
 * command is run with --confirm. Warns while the written authorization is
 * still pending. Files are stored byte-for-byte (no
 * re-encoding, no upscaling); next/image resizes them per viewport.
 *
 *   npm run images:fetch -- --confirm
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Manifest = {
  authorization: {
    status: string;
    verbalConfirmation: { by: string; on: string } | null;
    writtenAuthorization: { document: string; signedBy: string; date: string } | null;
    scope: string;
  };
  targetDir: string;
  products: Record<string, { swatchHex: string | null; images: { file: string; view: string; alt: string; source: string }[] }>;
};

const MANIFEST = path.resolve("scripts/data/reference-images.json");
const MIN_EDGE = 800;

function webpSize(b: Buffer) {
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const t = b.toString("ascii", 12, 16);
  if (t === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (t === "VP8L") {
    const v = b.readUInt32LE(21);
    return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 };
  }
  return null;
}

async function main() {
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const auth = manifest.authorization;
  if ((!auth.verbalConfirmation && !auth.writtenAuthorization) || !process.argv.includes("--confirm")) {
    console.error(
      "✗ Téléchargement refusé : aucune autorisation enregistrée.\n" +
        "  Renseigne authorization.verbalConfirmation ou writtenAuthorization dans scripts/data/reference-images.json,\n" +
        "  puis relance avec --confirm.",
    );
    process.exit(1);
  }
  if (!auth.writtenAuthorization) {
    console.warn("! Autorisation écrite du client en attente : usage limité à la recette / préproduction.");
  }

  const dir = path.resolve(manifest.targetDir);
  mkdirSync(dir, { recursive: true });
  const lock: Record<string, unknown> = {};

  for (const [slug, entry] of Object.entries(manifest.products)) {
    for (const img of entry.images) {
      const res = await fetch(img.source, { headers: { "User-Agent": "ecom-brasil asset import" } });
      if (!res.ok) throw new Error(`${img.source} → HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const size = webpSize(buf);
      if (!size) throw new Error(`${img.source} n'est pas une image WebP valide.`);
      if (Math.min(size.w, size.h) < MIN_EDGE) throw new Error(`${img.source} trop petite (${size.w}×${size.h}).`);
      writeFileSync(path.join(dir, img.file), buf);
      lock[img.file] = {
        product: slug,
        view: img.view,
        source: img.source,
        width: size.w,
        height: size.h,
        bytes: buf.length,
        sha256: createHash("sha256").update(buf).digest("hex"),
        fetchedAt: new Date().toISOString(),
      };
      console.log(`  ✓ ${img.file}  ${size.w}×${size.h}  ${Math.round(buf.length / 1024)} Ko`);
    }
  }

  // Provenance stays out of public/: it holds internal authorization notes.
  writeFileSync(
    path.resolve("docs/provenance/product-images.json"),
    JSON.stringify({ authorization: auth, files: lock }, null, 2) + "\n",
    "utf8",
  );
  console.log(`✓ ${Object.keys(lock).length} image(s) dans ${path.relative(process.cwd(), dir)} (provenance : docs/provenance/product-images.json)`);
}

main().catch((err) => {
  console.error("✗", err.message ?? err);
  process.exit(1);
});
