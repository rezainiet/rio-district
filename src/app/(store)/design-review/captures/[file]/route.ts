import { readFile } from "node:fs/promises";
import path from "node:path";
import { designReviewEnabled } from "@/lib/design-review";

/** Serves the review screenshots (docs/design-review/screenshots) to the comparison page. Dev only. */
export async function GET(_req: Request, { params }: RouteContext<"/design-review/captures/[file]">) {
  if (!designReviewEnabled()) return new Response("Not found", { status: 404 });
  const { file } = await params;
  if (!/^[a-z0-9-]+\.jpg$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(path.join(process.cwd(), "docs/design-review/screenshots", file));
    return new Response(body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
