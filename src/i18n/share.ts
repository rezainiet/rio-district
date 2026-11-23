import type { Metadata } from "next";
import { OG_LOCALE } from "./config";
import type { Translator } from "./translate";

/**
 * Open Graph / Twitter defaults in the page's language, with the link-preview
 * image of that language (src/app/og/[lang]/route.tsx). Next.js replaces a
 * parent's `openGraph` object instead of merging it, so a page that sets its
 * own `openGraph` should spread `shareDefaults(…).openGraph` first.
 */
export function shareDefaults({ t, locale }: Translator, siteName = "Rio District"): { openGraph: NonNullable<Metadata["openGraph"]>; twitter: NonNullable<Metadata["twitter"]> } {
  const image = { url: `/og/${locale}`, width: 1200, height: 630, alt: t("Rio District — Vestes Brésil, 19,99 € la veste, 24,95 € les deux") };
  return {
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale: Object.values(OG_LOCALE).filter((l) => l !== OG_LOCALE[locale]),
      siteName,
      images: [image],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
