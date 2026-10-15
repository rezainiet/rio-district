import "server-only";
import { productInputSchema } from "./validation";
import type { z } from "zod";

/** Image hosts allowed besides local /uploads and /products paths (comma-separated env). */
export function allowedImageHosts() {
  return (process.env.IMAGE_REMOTE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function checkImageUrls(images: { url: string }[]) {
  const hosts = allowedImageHosts();
  const fields: Record<string, string> = {};
  images.forEach((img, i) => {
    if (img.url.startsWith("/")) {
      if (img.url.includes("..")) fields[`images.${i}.url`] = "Chemin invalide.";
      return;
    }
    try {
      const host = new URL(img.url).hostname.toLowerCase();
      if (!hosts.includes(host)) {
        fields[`images.${i}.url`] = `Domaine non autorisé (${host}). Téléverse l'image ou ajoute le domaine à IMAGE_REMOTE_HOSTS.`;
      }
    } catch {
      fields[`images.${i}.url`] = "URL invalide.";
    }
  });
  return fields;
}

/** Maps validated form input to the Mongo document shape. */
export function toProductDoc(input: z.output<typeof productInputSchema>) {
  const { categoryId, ...rest } = input;
  return {
    ...rest,
    category: categoryId ? categoryId : null,
    // Keep only sizes that are either offered or have stock history.
    sizes: input.sizes.filter((s) => s.enabled || s.stock !== null),
  };
}
