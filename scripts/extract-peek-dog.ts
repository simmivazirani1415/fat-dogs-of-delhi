/**
 * Cuts the golden retriever peeking over the modal edge out of the Add-a-dog mockup
 * into public/brand/peek-dog.png.
 *  - Above the panel edge: the dark, blurred page is keyed out (fur is far brighter).
 *  - Below it: kept opaque. The mockup's cream panel (248,242,233) is within ~3 levels of ours
 *    (#FBF5EC), so the chin, mouth, paws and their soft shadow sit seamlessly on our panel;
 *    only the outer borders fade out.
 * Prints where the panel edge lands so components/map/PeekDog.tsx can align it.
 *
 *   pnpm tsx scripts/extract-peek-dog.ts
 */
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "design/add-dog-modal.png");
// The source mockup is not part of the repo; the generated image is already committed in public/brand/.
if (!existsSync(SRC)) {
  console.log(`Source mockup ${path.relative(ROOT, SRC)} not found — nothing to regenerate (public/brand/ already has the image).`);
  process.exit(0);
}
const OUT = path.join(ROOT, "public/brand/peek-dog.png");

const box = { left: 686, top: 8, width: 328, height: 200 }; // paws ≈ x 693–1005, chin shadow ends ≈ y 200
const EDGE_Y = 141 - box.top; // first fully-cream row of the panel, in box coordinates
const FADE = 14;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const { data, info } = await sharp(SRC).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.from(data);
const W = info.width;

// Above the edge: luminance key, but only for backdrop *connected to the border* —
// the dark eyes and nose sit inside the silhouette and must stay opaque.
const key = new Float32Array(W * EDGE_Y);
for (let y = 0; y < EDGE_Y; y++)
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    key[y * W + x] = clamp01((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] - 100) / 30);
  }
const outside = new Uint8Array(W * EDGE_Y);
const stack: number[] = [];
for (let x = 0; x < W; x++) stack.push(x); // top row
for (let y = 0; y < EDGE_Y; y++) stack.push(y * W, y * W + W - 1); // side columns
while (stack.length) {
  const p = stack.pop()!;
  if (outside[p] || key[p] >= 0.5) continue;
  outside[p] = 1;
  const x = p % W, y = (p - x) / W;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - W);
  if (y < EDGE_Y - 1) stack.push(p + W);
}
const nearOutside = (x: number, y: number) => {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < W && yy >= 0 && yy < EDGE_Y && outside[yy * W + xx]) return true;
    }
  return false;
};

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let a: number;
    if (y < EDGE_Y) {
      const p = y * W + x;
      // soft key only along the silhouette edge; solid inside
      a = outside[p] ? 0 : nearOutside(x, y) ? key[p] : 1;
    } else {
      const edge = Math.min(x, info.width - 1 - x, info.height - 1 - y);
      a = clamp01(edge / FADE);
    }
    out[i + 3] = Math.round(a * 255);
  }
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(OUT);
console.log(
  `wrote ${path.relative(ROOT, OUT)} ${info.width}×${info.height}; panel edge at y=${EDGE_Y} (${((EDGE_Y / info.height) * 100).toFixed(1)}% from top)`,
);
