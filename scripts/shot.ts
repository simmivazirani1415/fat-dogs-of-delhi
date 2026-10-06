/**
 * Visual QA: screenshot a page (optionally hovering an element) and, if a mockup is given,
 * write a side-by-side comparison.
 *
 *   pnpm tsx scripts/shot.ts --url http://localhost:3000/ --out shots/home.png \
 *     [--size 1440x900] [--hover 'selector'] [--full] [--mockup path/to/mockup.png] [--wait 1800]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const argv = process.argv.slice(2);
const arg = (name: string, fallback?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const flag = (name: string) => argv.includes(`--${name}`);

const url = arg("url", "http://localhost:3000/")!;
const out = arg("out", "shots/shot.png")!;
const [width, height] = arg("size", "1440x900")!.split("x").map(Number);
const hover = arg("hover");
const click = arg("click");
const mockup = arg("mockup");
const wait = Number(arg("wait", "1800"));
const reduced = flag("reduced");

await fs.mkdir(path.dirname(out), { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
  reducedMotion: reduced ? "reduce" : "no-preference",
  hasTouch: width < 768,
  isMobile: width < 768,
});
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(wait);
if (flag("scroll")) {
  // walk down the page so scroll-triggered (whileInView) content reveals, then return to top
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}
if (hover) {
  await page.hover(hover, { force: true });
  await page.waitForTimeout(500);
}
if (click) {
  await page.click(click, { force: true });
  await page.waitForTimeout(700);
}
await page.screenshot({ path: out, fullPage: flag("full") });
await browser.close();
console.log(`wrote ${out}`);

if (mockup) {
  // scale both to the same height and place side by side with a gap
  const h = 900;
  const [a, b] = await Promise.all(
    [mockup, out].map((f) => sharp(f).resize({ height: h }).toBuffer({ resolveWithObject: true })),
  );
  const gap = 24;
  const cmp = out.replace(/\.png$/, "-vs-mockup.png");
  await sharp({
    create: { width: a.info.width + b.info.width + gap, height: h, channels: 3, background: "#d9d2c8" },
  })
    .composite([
      { input: a.data, left: 0, top: 0 },
      { input: b.data, left: a.info.width + gap, top: 0 },
    ])
    .png()
    .toFile(cmp);
  console.log(`wrote ${cmp}`);
}
