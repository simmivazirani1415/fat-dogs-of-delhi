/**
 * End-to-end check of /dogs/map: clusters, INDIA/DELHI/NEAR ME fly-to, list hover → pin bounce,
 * search filtering list + map, marker ↔ list sync, upload CTA, ?dog= deep link, mobile.
 *   pnpm tsx scripts/verify-dog-map.ts
 */
import { chromium, type Page } from "playwright";

const BASE = "http://localhost:3000";
const log = (label: string, value: unknown) =>
  console.log(`${label.padEnd(44)} ${typeof value === "string" ? value : JSON.stringify(value)}`);

type Cam = { lng: number; lat: number; zoom: number };
const camera = (p: Page) =>
  p.evaluate(() => {
    const m = (window as unknown as { __maps: { getCenter(): { lng: number; lat: number }; getZoom(): number }[] }).__maps.at(-1)!;
    const c = m.getCenter();
    return { lng: +c.lng.toFixed(2), lat: +c.lat.toFixed(2), zoom: +m.getZoom().toFixed(2) } as Cam;
  });
/** dogs represented by the markers currently on the map (cluster counts + singles) */
const markerStats = (p: Page) =>
  p.evaluate(() => {
    const ms = [...document.querySelectorAll<HTMLElement>(".dog-marker")];
    const clusters = ms.filter((m) => m.classList.contains("is-cluster"));
    const dogs = ms.reduce((n, m) => n + (Number(m.querySelector(".dog-marker__count")?.textContent) || 1), 0);
    return { markers: ms.length, clusters: clusters.length, dogs };
  });
const waitIdle = (p: Page) =>
  p.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const m = (window as unknown as { __maps: { once(e: string, f: () => void): void; isMoving(): boolean }[] }).__maps.at(-1)!;
        if (!m.isMoving()) setTimeout(resolve, 300);
        else m.once("moveend", () => setTimeout(resolve, 300));
      }),
  );

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  geolocation: { latitude: 19.076, longitude: 72.8777 }, // Mumbai
  permissions: ["geolocation"],
});
const page = await context.newPage();
await page.goto(`${BASE}/dogs/map`, { waitUntil: "load" });
await page.locator(".dog-marker").first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1200);

log("header pill", await page.locator("header p").first().innerText());
log("list count line", await page.getByText(/dogs · tournament dogs first/).innerText());

// --- clusters
const start = await markerStats(page);
log("India view: markers / clusters / dogs shown", start);
const big = page.locator(".dog-marker.is-cluster").filter({ has: page.locator(".dog-marker__count") });
const counts = await big.locator(".dog-marker__count").allInnerTexts();
const biggest = counts.map(Number).reduce((a, b, i, arr) => (b > arr[a] ? i : a), 0);
const before = await camera(page);
await big.nth(biggest).click({ force: true });
await waitIdle(page);
const after = await camera(page);
log(`click cluster of ${counts[biggest]} → zoom`, `${before.zoom} → ${after.zoom}`);
log("  markers after zoom-in", await markerStats(page));
await page.screenshot({ path: "shots/dog-map-cluster-zoom.png" });

// --- chips
const chip = (name: RegExp) => page.getByRole("button", { name });
await chip(/^Delhi$/i).click();
await page.waitForTimeout(1500);
await waitIdle(page);
const delhi = await camera(page);
log("DELHI chip → camera", delhi);
log("  pressed", await chip(/^Delhi$/i).getAttribute("aria-pressed"));
await page.screenshot({ path: "shots/dog-map-delhi.png" });
await page.getByRole("button", { name: "Near me", exact: true }).click();
await page.waitForTimeout(1800); // geolocation + 1.2 s flight
await waitIdle(page);
log("NEAR ME (geolocation = Mumbai) → camera", await camera(page));
await chip(/^India$/i).click();
await page.waitForTimeout(1500);
await waitIdle(page);
log("INDIA chip → camera", await camera(page));

// --- list hover bounces the dog's pin (or the cluster it is in)
const card = page.locator('[data-list-dog="d17a"]');
await card.hover();
await page.waitForTimeout(250);
const bouncing = await page.evaluate(() =>
  [...document.querySelectorAll(".dog-marker.is-bouncing")].map((m) => (m as HTMLElement).dataset.markerFor),
);
log("hover list card #1 (Gola) → bouncing marker", bouncing);
await page.screenshot({ path: "shots/dog-map-hover.png" });
await page.mouse.move(5, 5);
await page.waitForTimeout(200);
log("  after mouse leaves", await page.locator(".dog-marker.is-bouncing").count());

// --- search filters list AND map
const search = page.getByLabel("Find a dog or place");
await search.fill("Mumbai");
await page.waitForTimeout(500);
await waitIdle(page);
const listLine = await page.getByText(/match(es)?$/).innerText();
const mumbai = await markerStats(page);
log('search "Mumbai" → list', listLine);
log("  map now shows", mumbai);
await search.fill("Gola");
await page.waitForTimeout(500);
log('search "Gola" → list', `${await page.getByText(/match(es)?$/).innerText()} · first: ${(await page.locator("[data-list-dog]").first().innerText()).split("\n")[1]}`);
log("  map now shows", await markerStats(page));
await search.fill("");
await page.waitForTimeout(400);

// --- list click → fly + popup; marker click → popup + highlighted card
await page.locator('[data-list-dog="d03b"]').click();
await page.locator(".dog-popup").waitFor({ timeout: 5000 });
await waitIdle(page);
log("click list card Googoo → popup", (await page.locator(".dog-popup").innerText()).replace(/\s+/g, " "));
log("  camera", await camera(page));
await page.screenshot({ path: "shots/dog-map-popup.png" });

await page.locator(".dog-popup-wrap .maplibregl-popup-close-button").click();
await page.waitForTimeout(300);
const singleFor = await page.evaluate(() => {
  const box = document.querySelector('[aria-label="Map of fat dogs across India"]')!.getBoundingClientRect();
  const inside = [...document.querySelectorAll<HTMLElement>(".dog-marker:not(.is-cluster)")].find((m) => {
    const r = m.getBoundingClientRect();
    return r.left > box.left + 40 && r.right < box.right - 40 && r.top > box.top + 40 && r.bottom < box.bottom - 40 && m.dataset.markerFor !== "d03b";
  });
  return inside?.dataset.markerFor ?? null;
});
const single = page.locator(`.dog-marker[data-marker-for="${singleFor}"]`);
await single.click({ force: true });
await page.waitForTimeout(600);
log("click a single marker → popup for", (await page.locator(".dog-popup__name").innerText()));
const listCard = page.locator(`[data-list-dog="${singleFor}"]`);
await listCard.waitFor({ timeout: 4000 });
log("  list scrolled to it + highlighted", await listCard.evaluate((el) => el.className.includes("border-yellow")));

// --- upload CTA opens the shared modal
await page.getByRole("button", { name: /Upload your fat dog/ }).first().click();
await page.getByRole("dialog", { name: "Add a fat dog" }).waitFor();
log("page Upload CTA → modal", "open");
await page.keyboard.press("Escape");

// --- deep link from the Dog detail sheet
await page.goto(`${BASE}/dogs/map?dog=d17a`, { waitUntil: "load" });
await page.locator(".dog-popup").waitFor({ timeout: 15000 });
log("?dog=d17a → popup", (await page.locator(".dog-popup__name").innerText()));

// --- mobile: map stacks above the list
const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
const m = await phone.newPage();
await m.goto(`${BASE}/dogs/map`, { waitUntil: "load" });
await m.locator(".dog-marker").first().waitFor({ timeout: 20000 });
const layout = await m.evaluate(() => {
  const map = document.querySelector('[aria-label="Map of fat dogs across India"]')!.getBoundingClientRect();
  const list = document.querySelector('aside[aria-label="Dogs on the map"]')!.getBoundingClientRect();
  return { mapAboveList: map.bottom <= list.top, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
log("mobile", layout);
await m.screenshot({ path: "shots/dog-map-mobile.png", fullPage: true });

await browser.close();
