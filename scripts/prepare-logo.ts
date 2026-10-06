/**
 * public/brand/logo.png ships on an opaque off-white background (with a soft beige smudge),
 * which shows as a box on the cream UI. This derives public/brand/logo-cutout.png:
 * black lettering + yellow paw on transparency, trimmed to the artwork.
 *
 *   pnpm tsx scripts/prepare-logo.ts
 */
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const src = path.join(ROOT, "public/brand/logo.png");
const dest = path.join(ROOT, "public/brand/logo-cutout.png");

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  const ink = clamp01((190 - lum) / 150); // black letters; the beige smudge (lum ≈ 220) drops out
  const paw = clamp01((sat - 70) / 50); // saturated yellow paw
  const a = Math.max(ink, paw);
  // Paw pixels keep their colour; lettering is flattened to near-black so edges don't halo.
  const useColour = paw >= ink;
  out[i] = useColour ? r : 22;
  out[i + 1] = useColour ? g : 16;
  out[i + 2] = useColour ? b : 12;
  out[i + 3] = Math.round(a * 255);
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim({ threshold: 1 })
  .png({ compressionLevel: 9 })
  .toFile(dest);
const meta = await sharp(dest).metadata();
console.log(`wrote ${path.relative(ROOT, dest)} (${meta.width}×${meta.height})`);
