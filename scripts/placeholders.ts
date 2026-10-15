/**
 * Generates original SVG jacket illustrations used as clearly labelled
 * placeholder product images until the client supplies licensed photos.
 * They intentionally contain no third-party logos or crests.
 *
 * The "provisional" label is rendered by the storefront UI (images flagged
 * kind: "placeholder"), not baked into the artwork, so it stays legible at
 * every size. Backgrounds are flat so tiles can sit edge to edge.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Swatch = { body: string; shade: string; trim: string; trim2: string; zip: string; light: boolean };

export const BACKDROP = "#EAE5DA";

/* Garment geometry (viewBox 800 × 1000). Left half; the right half is mirrored. */
const BODY =
  "M335,232 C305,240 285,250 272,264 L268,520 C266,640 270,760 276,858 C340,874 460,874 524,858 C530,760 534,640 532,520 L528,264 C515,250 495,240 465,232 C447,246 425,254 400,254 C375,254 353,246 335,232 Z";
const SLEEVE =
  "M310,236 C276,244 252,262 238,292 C206,350 176,440 160,530 L128,752 C150,766 190,770 212,762 L232,580 C242,500 254,430 272,360 C284,310 296,264 310,236 Z";
const CUFF = "M128,746 C150,760 190,764 212,756 L208,796 C186,802 154,800 130,788 Z";
const HOOD_BACK = "M306,252 C284,170 334,108 400,106 C466,108 516,170 494,252 C470,236 436,226 400,226 C364,226 330,236 306,252 Z";
const HOOD_LINING = "M338,250 C330,196 360,152 400,150 C440,152 470,196 462,250 C444,240 424,236 400,236 C376,236 356,240 338,250 Z";
const COLLAR = "M326,236 C350,254 374,262 400,262 C426,262 450,254 474,236 L480,262 C454,284 428,292 400,292 C372,292 346,284 320,262 Z";
const HEM = "M276,834 C340,850 460,850 524,834 L526,860 C460,878 340,878 274,860 Z";
const STRIPE = "M302,244 C268,262 244,300 228,350 C204,424 186,500 172,580 L148,742";

function mirror(d: string, attrs: string) {
  return `<g transform="translate(800 0) scale(-1 1)"><path d="${d}" ${attrs}/></g>`;
}

function jacket(c: Swatch, view: "front" | "back") {
  const seam = c.light ? "rgba(0,0,0,.16)" : "rgba(0,0,0,.38)";
  const crease = c.light ? "rgba(0,0,0,.07)" : "rgba(0,0,0,.22)";
  const sheen = c.light ? 0.5 : 0.16;

  const both = (d: string, attrs: string) => `<path d="${d}" ${attrs}/>${mirror(d, attrs)}`;

  const frontOnly = `
    <path d="${COLLAR}" fill="${c.shade}"/>
    <path d="M400,262 L400,868" stroke="${c.zip}" stroke-width="7"/>
    <path d="M400,266 L400,866" stroke="${c.light ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.22)"}" stroke-width="2" stroke-dasharray="2 4"/>
    <rect x="391" y="300" width="18" height="34" rx="5" fill="${c.zip}"/>
    <rect x="396" y="290" width="8" height="14" rx="2" fill="${c.zip}"/>
    <path d="M382,276 C378,306 374,336 371,372" stroke="${c.trim2}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M418,276 C422,306 426,336 429,372" stroke="${c.trim2}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <rect x="365" y="368" width="12" height="22" rx="4" fill="${c.zip}"/>
    <rect x="423" y="368" width="12" height="22" rx="4" fill="${c.zip}"/>
    ${both("M300,612 L332,712", `stroke="${seam}" stroke-width="5" stroke-linecap="round"`)}
    ${both("M304,612 L336,712", `stroke="${c.light ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.12)"}" stroke-width="1.5"`)}
    <path d="M268,470 C330,488 470,488 532,470" stroke="${seam}" stroke-width="2" fill="none"/>`;

  const backOnly = `
    <path d="${HOOD_BACK}" fill="${c.body}"/>
    <path d="${HOOD_BACK}" fill="url(#hood)"/>
    <path d="M400,108 L400,232" stroke="${seam}" stroke-width="2.5"/>
    <path d="M270,350 C330,372 470,372 530,350" stroke="${seam}" stroke-width="2.5" fill="none"/>
    <path d="M310,362 L310,374 M490,362 L490,374" stroke="${seam}" stroke-width="2"/>`;

  return `
  <ellipse cx="400" cy="902" rx="200" ry="20" fill="#000" opacity=".12" filter="url(#blur)"/>
  <g filter="url(#drop)">
    ${view === "front" ? `<path d="${HOOD_BACK}" fill="${c.shade}"/><path d="${HOOD_LINING}" fill="${c.zip}" opacity=".55"/>` : ""}
    ${both(SLEEVE, `fill="${c.body}"`)}
    <path d="${BODY}" fill="${c.body}"/>
  </g>
  <path d="${BODY}" fill="url(#vol)"/>
  <path d="${SLEEVE}" fill="url(#volL)"/>${mirror(SLEEVE, 'fill="url(#volL)"')}
  <ellipse cx="350" cy="380" rx="70" ry="120" fill="url(#sheen)" opacity="${sheen}"/>
  ${both(STRIPE, `stroke="${c.trim}" stroke-width="13" fill="none" stroke-linecap="round"`)}
  ${both(STRIPE, `stroke="${c.trim2}" stroke-width="3.5" fill="none" transform="translate(9 2)"`)}
  ${both("M335,236 C312,276 290,320 272,360", `stroke="${seam}" stroke-width="2.2" fill="none"`)}
  ${both("M190,520 C204,512 222,514 236,526", `stroke="${crease}" stroke-width="5" fill="none" stroke-linecap="round"`)}
  ${both("M178,610 C192,604 210,606 224,616", `stroke="${crease}" stroke-width="4" fill="none" stroke-linecap="round"`)}
  ${both("M296,420 C318,470 330,540 326,640", `stroke="${crease}" stroke-width="6" fill="none" stroke-linecap="round"`)}
  ${both(CUFF, `fill="${c.shade}"`)}
  <path d="${HEM}" fill="${c.shade}"/>
  ${both("M290,846 L290,866", `stroke="${c.zip}" stroke-width="7" stroke-linecap="round"`)}
  ${view === "front" ? frontOnly : backOnly}`;
}

function frame(inner: string, transform = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="vol" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/>
      <stop offset=".18" stop-color="#000" stop-opacity=".04"/>
      <stop offset=".42" stop-color="#fff" stop-opacity=".10"/>
      <stop offset=".62" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".86" stop-color="#000" stop-opacity=".08"/>
      <stop offset="1" stop-color="#000" stop-opacity=".26"/>
    </linearGradient>
    <linearGradient id="volL" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".24"/>
      <stop offset=".55" stop-color="#fff" stop-opacity=".06"/>
      <stop offset="1" stop-color="#000" stop-opacity=".18"/>
    </linearGradient>
    <linearGradient id="hood" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".2"/>
    </linearGradient>
    <radialGradient id="sheen"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity=".16"/>
    </filter>
    <filter id="blur"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect width="800" height="1000" fill="${BACKDROP}"/>
  <g transform="${transform}">${inner}</g>
</svg>`;
}

export function writePlaceholders(slug: string, _colorName: string, swatch: Swatch, outDir: string) {
  mkdirSync(outDir, { recursive: true });
  const files = [
    { name: `${slug}-face.svg`, svg: frame(jacket(swatch, "front")), alt: "vue de face" },
    { name: `${slug}-dos.svg`, svg: frame(jacket(swatch, "back")), alt: "vue de dos" },
    {
      name: `${slug}-detail.svg`,
      svg: frame(jacket(swatch, "front"), "translate(400 520) scale(1.75) translate(-372 -390)"),
      alt: "détail col, zip et manche",
    },
  ];
  for (const f of files) writeFileSync(path.join(outDir, f.name), f.svg, "utf8");
  return files.map((f) => ({ file: f.name, alt: f.alt }));
}
