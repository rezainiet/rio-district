import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const directory = join(root, "public", "products", "reference");
const colors = ["vert", "rose", "noir", "jaune", "bleu", "blanc"];
const labels = ["VERT", "ROSE", "NOIR", "JAUNE", "BLEU", "BLANC"];
const width = 1200;
const tile = 376;
const gap = 14;
const left = 22;
const top = 178;

const photos = await Promise.all(colors.map(async (color, index) => ({
  input: await sharp(join(directory, `veste-bresil-${color}-face.webp`))
    .resize(tile, tile, { fit: "cover" })
    .toBuffer(),
  left: left + (index % 3) * (tile + gap),
  top: top + Math.floor(index / 3) * (tile + gap),
})));

const captions = labels.map((label, index) => {
  const x = left + (index % 3) * (tile + gap);
  const y = top + Math.floor(index / 3) * (tile + gap);
  return `<rect x="${x}" y="${y + tile - 43}" width="${tile}" height="43" fill="#111113" fill-opacity="0.9"/><text x="${x + 18}" y="${y + tile - 15}" fill="#f6f2ea" font-family="Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="3">${label}</text>`;
}).join("");

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
  <text x="30" y="87" fill="#f6f2ea" font-family="Arial, sans-serif" font-size="68" font-weight="900" letter-spacing="5">LE DUO</text>
  <text x="32" y="133" fill="#c9ab6b" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="3">2 VESTES · 6 COLORIS AU CHOIX</text>
  ${captions}
  <text x="600" y="1122" fill="#f6f2ea" text-anchor="middle" font-family="Arial, sans-serif" font-size="31" font-weight="700" letter-spacing="3">CHOISIS TES DEUX COULEURS</text>
  <text x="600" y="1161" fill="#c9ab6b" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="4">RIO DISTRICT</text>
</svg>`);

await sharp({ create: { width, height: width, channels: 4, background: "#0b0b0c" } })
  .composite([...photos, { input: overlay, left: 0, top: 0 }])
  .webp({ quality: 90, effort: 6 })
  .toFile(join(directory, "bundle-six-colors.webp"));
