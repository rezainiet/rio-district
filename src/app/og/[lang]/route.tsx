import { ImageResponse } from "next/og";
import { isLocale } from "@/i18n/config";
import { translate } from "@/i18n/translate";

/**
 * Link-preview image (Open Graph / Twitter), one per language: /og/fr and /og/es.
 * Built once at build time; the root layout points each page at its language's image.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "fr" }, { lang: "es" }];
}

const COLORS = ["#9DD0CA", "#EBA6BE", "#1B1B1B", "#F1F0EA", "#0B4A9E", "#E9E21A"];

export async function GET(_req: Request, { params }: RouteContext<"/og/[lang]">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "fr";
  const t = (key: string) => translate(locale, key);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b0b0c", color: "#f2eee6", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 800, letterSpacing: 6 }}>RIO DISTRICT</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, fontWeight: 900, lineHeight: 0.92, letterSpacing: -2, textTransform: "uppercase" }}>{t("Vestes Brésil")}</div>
          <div style={{ display: "flex", marginTop: 32, fontSize: 40, gap: 32 }}>
            <span>{t("19,99 € la veste")}</span>
            <span style={{ color: "#c8a96a", fontWeight: 700 }}>{t("24,95 € les deux")}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {COLORS.map((c) => (
            <div key={c} style={{ width: 56, height: 56, borderRadius: 999, background: c, border: "2px solid rgba(255,255,255,.18)" }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
