/**
 * Cuts the two hero dogs (golden retriever, corgi) out of the My bracket mockup into
 * public/brand/bracket-dog-left.png and -right.png (transparent). The pale yellow / cream blobs,
 * the page background and the overlapping progress pill are keyed out by a flood fill from the
 * crop border (only background *connected to the edge* goes, so pale fur inside the dog stays).
 * The page redraws the blobs in CSS behind them.
 *
 *   pnpm tsx scripts/extract-bracket-dogs.ts
 */
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "design/my-bracket.png");
// The source mockup is not part of the repo; the generated image is already committed in public/brand/.
if (!existsSync(SRC)) {
  console.log(`Source mockup ${path.relative(ROOT, SRC)} not found — nothing to regenerate (public/brand/ already has the image).`);
  process.exit(0);
}

type Box = { left: number; top: number; width: number; height: number };
const JOBS: { out: string; box: Box; whiteFur: boolean }[] = [
  { out: "public/brand/bracket-dog-left.png", box: { left: 0, top: 95, width: 236, height: 330 }, whiteFur: false },
  // the corgi has pure-white fur, so its background key must not swallow white
  { out: "public/brand/bracket-dog-right.png", box: { left: 790, top: 90, width: 234, height: 300 }, whiteFur: true },
];

const sat = (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b);
const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** page cream, pale-yellow blob, cream blob, white pill — all light and only mildly warm */
function isBackground(r: number, g: number, b: number, whiteFur: boolean) {
  const L = lum(r, g, b);
  const S = sat(r, g, b);
  if (whiteFur) return L > 214 && S >= 13 && S < 42; // warm cream only; white fur (S < 13) stays
  const paleYellow = L > 222 && b > 150 && S < 95 && r - b < 95; // blob: ~ (252,232,175)
  const cream = L > 228 && S < 40; // page + cream blob + pill
  return paleYellow || cream;
}

for (const job of JOBS) {
  const { data, info } = await sharp(SRC).extract(job.box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const bg = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) bg[p] = isBackground(data[p * 4], data[p * 4 + 1], data[p * 4 + 2], job.whiteFur) ? 1 : 0;

  const outside = new Uint8Array(W * H);
  const stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (outside[p] || !bg[p]) continue;
    outside[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  // keep only the largest opaque component (drops stray bits of blob edge)
  const comp = new Int32Array(W * H).fill(-1);
  const sizes: number[] = [];
  for (let p0 = 0; p0 < W * H; p0++) {
    if (outside[p0] || comp[p0] >= 0) continue;
    const id = sizes.length;
    let n = 0;
    const st = [p0];
    comp[p0] = id;
    while (st.length) {
      const p = st.pop()!;
      n++;
      const x = p % W, y = (p - x) / W;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1])
        if (q >= 0 && !outside[q] && comp[q] < 0) {
          comp[q] = id;
          st.push(q);
        }
    }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  for (let p = 0; p < W * H; p++) if (!outside[p] && comp[p] !== keep) outside[p] = 1;

  const out = Buffer.from(data);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      let a = 255;
      if (outside[p]) a = 0;
      else {
        // soften the silhouette: partially transparent where most neighbours are outside
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < W && yy >= 0 && yy < H && outside[yy * W + xx]) n++;
          }
        a = Math.round(255 * (1 - n / 12));
      }
      out[p * 4 + 3] = a;
    }

  // not trimmed: the image keeps the crop box, so the page can place it in mockup coordinates
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(ROOT, job.out));
  console.log(`wrote ${job.out} ${W}×${H} (box ${JSON.stringify(job.box)})`);
}
