import { notFound, permanentRedirect } from "next/navigation";
import { designReviewEnabled } from "@/lib/design-review";
import { RETURNS_PATH } from "@/lib/storefront";

/** The returns draft became the real page: keep old review links working (development only). */
export default function ReturnsPreviewRedirect() {
  if (!designReviewEnabled()) notFound();
  permanentRedirect(RETURNS_PATH);
}
