import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { getT } from "@/i18n/server";
import { shareDefaults } from "@/i18n/share";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  const { t } = tr;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("Rio District — Vestes Brésil"), template: "%s | Rio District" },
    description: t(
      "Vestes Brésil Rio District : coupe-vent léger, coupe ample, six coloris du XS au 3XL. 19,99 € la veste, 24,95 € les deux.",
    ),
    // Link-preview image and locale in the page's language.
    ...shareDefaults(tr),
  };
}

export const viewport: Viewport = {
  themeColor: "#f3efe6",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getT();
  return (
    <html lang={locale} className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
