/**
 * Acceptance audit across every page: horizontal overflow at 375/768/1280/1440, one <h1>, alt text,
 * accessible names, tap targets, SEO tags, console errors, reduced motion, keyboard focus visibility.
 *   pnpm tsx scripts/audit.ts [--base http://localhost:3000]
 */
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const BASE = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : "http://localhost:3000";
const PAGES = ["/", "/leaderboard", "/predictions", "/predictions?view=leaderboard", "/dogs/map", "/bracket", "/bracket/matchups", "/bracket?user=sameererror_"];
const WIDTHS: [number, number][] = [[375, 812], [768, 1024], [1280, 800], [1440, 900]];
const LAUNCH = { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] };

type Issue = { page: string; width?: number; check: string; detail: string };
const issues: Issue[] = [];
const fail = (i: Issue) => issues.push(i);

const browser = await chromium.launch(LAUNCH);
// tsx (esbuild keepNames) wraps named functions in __name(); define it inside pages too
const realNewContext = browser.newContext.bind(browser);
browser.newContext = (async (o?: Parameters<typeof realNewContext>[0]) => {
  const c = await realNewContext(o);
  await c.addInitScript(() => ((globalThis as unknown as { __name: unknown }).__name = (fn: unknown) => fn));
  return c;
}) as typeof browser.newContext;

for (const path of PAGES) {
  // ---------------- per-width layout checks
  for (const [w, h] of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    const p = await ctx.newPage();
    const errors: string[] = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource.*(dog-party|favicon)|React DevTools/.test(m.text())) errors.push(m.text().slice(0, 160));
    });
    await p.goto(BASE + path, { waitUntil: "load" });
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      const wide = overflow > 0
        ? [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1 && getComputedStyle(e).position !== "fixed" && !e.closest(".overflow-x-auto, [class*='overflow-x-auto'], .maplibregl-map, ol.snap-x, ul.snap-x"))
            .slice(0, 3)
            .map((e) => `${e.tagName}.${String((e as HTMLElement).className).slice(0, 50)}`)
        : [];
      // tap targets < 44px (visible, interactive, not inline text links)
      const small = [...document.querySelectorAll<HTMLElement>("button, a[href], input, [role=tab], [role=radio]")]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          if (!b.width || !b.height || getComputedStyle(e).visibility === "hidden") return false;
          if (e.closest(".maplibregl-ctrl-attrib, .maplibregl-marker, p, li > p, footer p")) return false;
          if (e.tagName === "INPUT" && (e as HTMLInputElement).type === "radio") return false;
          return b.height < 44 && b.width < 44;
        })
        .slice(0, 4)
        .map((e) => `${e.tagName}"${(e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 24)}" ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
      return { overflow, wide, small };
    });
    if (r.overflow > 0) fail({ page: path, width: w, check: "no horizontal scroll", detail: `${r.overflow}px ${r.wide.join(" | ")}` });
    if (w === 375 && r.small.length) fail({ page: path, width: w, check: "tap targets ≥ 44px", detail: r.small.join(" | ") });
    if (errors.length) fail({ page: path, width: w, check: "no console errors", detail: [...new Set(errors)].join(" | ") });
    await ctx.close();
  }

  // ---------------- semantics + SEO (desktop)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const s = await p.evaluate(() => {
    const meta = (sel: string) => document.querySelector<HTMLMetaElement>(sel)?.content ?? null;
    const imgs = [...document.querySelectorAll("img")];
    const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).map((i) => i.src.split("/").pop());
    // decorative (alt="") images must be inside aria-hidden or be non-content
    const unnamed = [...document.querySelectorAll<HTMLElement>("button, a[href], [role=tab]")]
      .filter((e) => {
        if (e.closest("[aria-hidden=true]")) return false;
        const name = (e.getAttribute("aria-label") ?? "") + (e.textContent ?? "") + (e.getAttribute("title") ?? "") + [...e.querySelectorAll("img")].map((i) => i.alt).join("");
        return !name.trim();
      })
      .map((e) => e.outerHTML.slice(0, 80));
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      ogImage: meta('meta[property="og:image"]'),
      ogLocale: meta('meta[property="og:locale"]'),
      theme: meta('meta[name="theme-color"]'),
      h1: document.querySelectorAll("h1").length,
      landmarks: { header: !!document.querySelector("header"), main: !!document.querySelector("main"), footer: !!document.querySelector("footer"), nav: !!document.querySelector("nav") },
      noAlt,
      unnamed: unnamed.slice(0, 4),
      dogAlts: imgs.filter((i) => /\/dogs\/d\d\d[ab]\./.test(i.src) && i.alt).map((i) => i.alt).slice(0, 2),
    };
  });
  if (!s.title) fail({ page: path, check: "<title>", detail: "missing" });
  if (!s.description) fail({ page: path, check: "meta description", detail: "missing" });
  if (!s.ogImage?.includes("/dogs/d17a.jpg")) fail({ page: path, check: "og:image", detail: String(s.ogImage) });
  if (s.ogLocale !== "en_IN") fail({ page: path, check: "og:locale", detail: String(s.ogLocale) });
  if (s.theme !== "#f4df4b") fail({ page: path, check: "theme-color", detail: String(s.theme) });
  if (s.h1 !== 1) fail({ page: path, check: "exactly one <h1>", detail: String(s.h1) });
  if (!Object.values(s.landmarks).every(Boolean)) fail({ page: path, check: "landmarks", detail: JSON.stringify(s.landmarks) });
  if (s.noAlt.length) fail({ page: path, check: "every <img> has alt", detail: s.noAlt.slice(0, 5).join(", ") });
  if (s.unnamed.length) fail({ page: path, check: "controls have accessible names", detail: s.unnamed.join(" | ") });
  for (const a of s.dogAlts) if (!/ from /.test(a)) fail({ page: path, check: 'dog alt "{name} from {area}"', detail: a });
  console.log(`${path.padEnd(32)} title="${s.title}"`);

  // ---------------- keyboard: Tab through first 25 stops, each must show a focus indicator
  const unfocused: string[] = [];
  for (let i = 0; i < 25; i++) {
    await p.keyboard.press("Tab");
    const f = await p.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const visible = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none" || parseFloat(cs.opacity) < 1; // logo dims instead of an outline
      return { visible, name: `${e.tagName}"${(e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 20)}"` };
    });
    if (f && !f.visible && !f.name.startsWith("NEXTJS-PORTAL")) unfocused.push(f.name); // dev overlay only
  }
  if (unfocused.length) fail({ page: path, check: "visible focus state", detail: [...new Set(unfocused)].slice(0, 5).join(" | ") });
  await ctx.close();

  // ---------------- reduced motion: nothing loops (float / bob / sway / pulse)
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rp = await rm.newPage();
  await rp.goto(BASE + path, { waitUntil: "load" });
  await rp.waitForTimeout(1500);
  const looping = await rp.evaluate(() =>
    document.getAnimations()
      .filter((a) => {
        const t = a.effect?.getTiming();
        return t && (t.iterations === Infinity || (typeof t.duration === "number" && t.duration > 50 && a.playState === "running"));
      })
      .map((a) => (a as CSSAnimation).animationName ?? "js-animation")
      .slice(0, 5),
  );
  if (looping.length) fail({ page: path, check: "reduced motion: no running animations", detail: [...new Set(looping)].join(", ") });
  await rm.close();
}

await browser.close();
console.log(`\n${issues.length} issue(s)`);
for (const i of issues) console.log(`✗ ${i.page}${i.width ? ` @${i.width}` : ""} · ${i.check} · ${i.detail}`);
