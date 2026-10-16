import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { REVIEW_PHOTO_DIR, REVIEW_PHOTO_NAME, REVIEW_PHOTO_PREFIX } from "@/lib/review-photos";
import { Testimonial } from "@/models/misc";

/**
 * Customer review photos. Visible to everyone only once the review is
 * published; before that, only a signed-in admin can see them (moderation).
 */
export async function GET(_req: Request, ctx: RouteContext<"/uploads/reviews/[file]">) {
  const { file } = await ctx.params;
  if (!REVIEW_PHOTO_NAME.test(file)) return new Response("Not found", { status: 404 });
  await connectDB();
  const url = `${REVIEW_PHOTO_PREFIX}/${file}`;
  const isPublic = Boolean(await Testimonial.exists({ photos: url, published: true }));
  if (!isPublic && !(await getAdmin())) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(path.join(REVIEW_PHOTO_DIR, file));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/webp",
        // Not "immutable": a photo must disappear when its review is unpublished.
        "Cache-Control": isPublic ? "public, max-age=3600" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
