import { ImageResponse } from "next/og";

export const alt = "KALT — Vestes Brésil, 19,99 € la veste, 24,95 € les deux";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = ["#1E6B45", "#EBA6BE", "#1B1B1B", "#F1F0EA", "#27479A", "#F2C824"];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f3efe6", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>KALT.</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4, textTransform: "uppercase" }}>Vestes Brésil</div>
          <div style={{ display: "flex", marginTop: 32, fontSize: 40, gap: 32 }}>
            <span>19,99 € la veste</span>
            <span style={{ color: "#0e5c3a", fontWeight: 700 }}>24,95 € les deux</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {COLORS.map((c) => (
            <div key={c} style={{ width: 56, height: 56, borderRadius: 999, background: c, border: "2px solid rgba(0,0,0,.12)" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
