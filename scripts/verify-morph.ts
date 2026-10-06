/**
 * End-to-end check: click a Home hero bubble → /leaderboard?dog=id with a view-transition morph,
 * the dog scrolled into view and its card/row glowing.
 *
 *   pnpm tsx scripts/verify-morph.ts [--bubble 1] [--reduced]
 * Writes a frame strip to shots/morph-<rank>.png.
 */
import fs from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const argv = process.argv.slice(2);
const bubble = Number(argv[argv.indexOf("--bubble") + 1] || 1);
const reduced = argv.includes("--reduced");
const BASE = "http://localhost:3000";

await fs.mkdir("shots", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: reduced ? "reduce" : "no-preference",
});

// Count view transitions and record when they finish.
await page.addInitScript(() => {
  type VT = { started: number; finished: number; updateMs?: number; morphTargetReady?: boolean; error?: string };
  const w = window as unknown as { __vt: VT; __glow: string[] };
  w.__vt = { started: 0, finished: 0 };
  w.__glow = [];
  // record glow on/off as it happens
  new MutationObserver((ms) =>
    ms.forEach((m) => {
      const t = m.target as HTMLElement;
      if (t.dataset?.glowTarget) w.__glow.push(`${Math.round(performance.now())}:${t.classList.contains("is-glowing") ? "on" : "off"}`);
    }),
  ).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  const orig = document.startViewTransition?.bind(document);
  if (orig) {
    document.startViewTransition = ((cb: () => Promise<void>) => {
      w.__vt.started++;
      const t0 = performance.now();
      const t = orig(async () => {
        await cb();
        w.__vt.updateMs = Math.round(performance.now() - t0);
        // a real morph needs a named destination when the new snapshot is taken
        w.__vt.morphTargetReady = !!document.querySelector("[data-vt-dog]");
      });
      t.finished.then(() => w.__vt.finished++).catch((e: Error) => (w.__vt.error = String(e)));
      return t;
    }) as typeof document.startViewTransition;
  }
});

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2200); // let the hero entrance finish

const link = page.locator(`[data-hero-bubble]:nth-child(${bubble}) a`);
const href = await link.getAttribute("href");
const dogId = new URL(href!, BASE).searchParams.get("dog")!;
await link.hover({ force: true });
await page.waitForTimeout(300);

const frames: Buffer[] = [];
await link.click({ force: true });
for (const t of [0, 80, 160, 260, 400]) {
  await page.waitForTimeout(t === 0 ? 0 : 80);
  frames.push(await page.screenshot());
}
await page.waitForURL(/\/leaderboard\?dog=/, { timeout: 5000 });

await page.waitForTimeout(500);
frames.push(await page.screenshot());
const glowAnim = await page.evaluate((id) => {
  const el = document.querySelector<HTMLElement>(`[data-glow-target="${id}"]`);
  const s = el ? getComputedStyle(el) : null;
  return s ? { name: s.animationName, iterations: s.animationIterationCount, duration: s.animationDuration } : null;
}, dogId);

const result = await page.evaluate((id) => {
  const row = document.querySelector<HTMLElement>(`[data-dog-row="${id}"]`);
  const r = row?.getBoundingClientRect();
  return {
    url: location.pathname + location.search,
    vt: (window as unknown as { __vt: unknown }).__vt,
    targetInViewport: !!r && r.top >= 0 && r.bottom <= innerHeight,
    targetTop: r ? Math.round(r.top) : null,
    scrollY: Math.round(scrollY),
  };
}, dogId);

await page.waitForTimeout(2400);
const glowLog = await page.evaluate(() => (window as unknown as { __glow: string[] }).__glow);
const glowSeen = glowLog.some((g) => g.endsWith(":on"));
const glowCleared = await page.evaluate((id) => !document.querySelector(`[data-glow-target="${id}"].is-glowing`), dogId);
const vtNameCleared = await page.evaluate(
  (id) => !document.querySelector(`[data-dog-photo="${id}"]`)?.getAttribute("style")?.includes("view-transition-name"),
  dogId,
);
await browser.close();

// frame strip
const thumbs = await Promise.all(frames.map((f) => sharp(f).resize({ width: 480 }).toBuffer({ resolveWithObject: true })));
const h = thumbs[0].info.height;
const out = `shots/morph-${bubble}${reduced ? "-reduced" : ""}.png`;
await sharp({ create: { width: thumbs.length * 488, height: h, channels: 3, background: "#d9d2c8" } })
  .composite(thumbs.map((t, i) => ({ input: t.data, left: i * 488, top: 0 })))
  .png()
  .toFile(out);

console.log(JSON.stringify({ bubble, dogId, reduced, ...result, glowSeen, glowLog, glowAnim, glowCleared, vtNameCleared, strip: out }, null, 2));
