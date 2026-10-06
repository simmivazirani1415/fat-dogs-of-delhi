/**
 * End-to-end check of the Add-a-dog modal and POST /api/dogs.
 *   pnpm tsx scripts/verify-add-dog.ts
 * Writes shots/add-dog-*.png. Leaves one test submission in /uploads (gitignored).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = "http://localhost:3000";
const TMP = path.join(process.cwd(), "shots", "fixtures");
await fs.mkdir(TMP, { recursive: true });
const log = (label: string, value: unknown) =>
  console.log(`${label.padEnd(40)} ${typeof value === "string" ? value : JSON.stringify(value)}`);

// --- fixtures: a JPEG carrying EXIF GPS, an oversized "photo", a text file
const gpsJpeg = path.join(TMP, "dog-with-gps.jpg");
await sharp({ create: { width: 640, height: 480, channels: 3, background: "#d9a066" } })
  .jpeg()
  .withExif({
    IFD0: { Make: "TestCam", Model: "QA" },
    IFD3: { GPSLatitudeRef: "N", GPSLatitude: "28/1 36/1 50/1", GPSLongitudeRef: "E", GPSLongitude: "77/1 12/1 32/1" },
  })
  .toFile(gpsJpeg);
const inExif = (await sharp(gpsJpeg).metadata()).exif;
log("fixture has EXIF GPS", !!inExif && inExif.includes(Buffer.from("GPS")) ? "yes" : String(!!inExif));
const bigJpeg = path.join(TMP, "too-big.jpg");
await fs.writeFile(bigJpeg, Buffer.concat([await fs.readFile(gpsJpeg), Buffer.alloc(6 * 1024 * 1024)]));
const txt = path.join(TMP, "notes.txt");
await fs.writeFile(txt, "not a dog");

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  geolocation: { latitude: 28.5494, longitude: 77.2001 }, // Hauz Khas
  permissions: ["geolocation"],
});
const page = await context.newPage();
const dialog = page.getByRole("dialog", { name: /Add a fat dog|Woof/ });

// 1. Home hero CTA opens it; focus moves inside; Tab stays inside; Esc closes and focus returns
await page.goto(`${BASE}/`, { waitUntil: "load" });
await page.waitForTimeout(2000);
const heroCta = page.locator("section[aria-labelledby=hero-title]").getByRole("button", { name: /Upload your fat dog/ }).last();
await heroCta.focus();
await page.keyboard.press("Enter");
await dialog.waitFor();
log("hero CTA → modal open", await dialog.isVisible());
log("focus on open", await page.evaluate(() => document.activeElement?.textContent));
let escaped = false;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press("Tab");
  if (!(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")))) escaped = true;
}
log("40× Tab, focus ever left dialog?", escaped);
await page.keyboard.press("Escape");
await dialog.waitFor({ state: "detached" });
log("Esc closes; focus back on CTA", await heroCta.evaluate((el) => el === document.activeElement));

// 2. /?upload=1 opens it; closing via × removes the param
await page.goto(`${BASE}/leaderboard?upload=1`, { waitUntil: "load" });
await dialog.waitFor();
log("/leaderboard?upload=1 → modal open", true);
await dialog.getByRole("button", { name: "Close" }).last().click();
await dialog.waitFor({ state: "detached" });
log("× closes; URL now", new URL(page.url()).pathname + new URL(page.url()).search);

// 3. validation
await page.goto(`${BASE}/?upload=1`, { waitUntil: "load" });
await dialog.waitFor();
await page.waitForTimeout(2500); // map + peek-dog entrance
await page.screenshot({ path: "shots/add-dog.png" });
await dialog.getByRole("button", { name: "Submit dog" }).click();
log("empty submit → errors", await dialog.getByRole("alert").allInnerTexts());
const fileInput = dialog.locator('input[type="file"]');
await fileInput.setInputFiles(txt);
log("text file", await dialog.getByRole("alert").first().innerText());
await fileInput.setInputFiles(bigJpeg);
log("6 MB jpeg", await dialog.getByRole("alert").first().innerText());

// 4. fill everything
await fileInput.setInputFiles(gpsJpeg);
log("preview shown", await dialog.getByAltText("Selected photo preview").isVisible());
await dialog.getByLabel("Dog’s name").fill("QA Biscuit");
await dialog.getByLabel("Area / city").fill("Hauz Khas, Delhi");
await dialog.getByRole("radio", { name: "X", exact: true }).click();
await dialog.getByLabel(/username/).fill("@bad handle!");
await dialog.getByRole("button", { name: "Submit dog" }).click();
log("bad handle", await dialog.getByRole("alert").allInnerTexts());
await dialog.getByLabel(/username/).fill("@qa_biscuit");
await dialog.getByRole("button", { name: "Use my location" }).click();
await page.waitForTimeout(1800); // flyTo
const circle = await page.evaluate(() => {
  const m = (window as unknown as { __maps?: { getSource: (id: string) => { _data?: { features?: unknown[] } } }[] }).__maps?.at(-1);
  const src = m?.getSource("accuracy") as unknown as { serialize?: () => { data: { features: unknown[] } } };
  return src?.serialize?.().data.features.length ?? null;
});
log("approx 1 km circle drawn", circle === 1);
await page.screenshot({ path: "shots/add-dog-filled.png" });

// 5. submit → success
await dialog.getByRole("button", { name: "Submit dog" }).click();
await page.getByText("They’re on the map once approved").waitFor({ timeout: 8000 });
const id = await dialog.locator("code").innerText();
log("success; submission ID", id);
await page.waitForTimeout(500);
await page.screenshot({ path: "shots/add-dog-success.png" });

// 6. stored record: pending, coords snapped, GPS stripped
const store = JSON.parse(await fs.readFile("uploads/submissions.json", "utf8"));
const rec = store.find((s: { id: string }) => s.id === id);
log("stored record", { status: rec.status, precision: rec.precision, lat: rec.lat, lng: rec.lng, handle: rec.handle, platform: rec.platform });
const stored = await sharp(path.join("uploads", rec.mediaFile)).metadata();
log("stored photo EXIF", stored.exif ? "present ✗" : "none (GPS stripped) ✓");
const status = await (await fetch(`${BASE}/api/dogs/status?q=${id}`)).json();
log("status lookup", status.results[0]?.status);

// 7. server-side validation + rate limit (separate fake client IP so the UI's quota isn't touched)
const post = async (fields: Record<string, string | Blob>, ip: string) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const r = await fetch(`${BASE}/api/dogs`, { method: "POST", body: fd, headers: { "x-forwarded-for": ip } });
  return { status: r.status, body: await r.json() };
};
const ipA = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
log("server: missing media", (await post({ name: "x", area: "y", lat: "28", lng: "77" }, ipA)).body.error);
const codes: number[] = [];
for (let i = 0; i < 6; i++) codes.push((await post({ name: "", area: "" }, ipA)).status);
log("server: 7 requests from one IP", codes.join(" "));

// 8. mobile: full-screen sheet
const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
const m = await phone.newPage();
await m.goto(`${BASE}/?upload=1`, { waitUntil: "load" });
await m.getByRole("dialog").waitFor();
await m.waitForTimeout(2500);
const box = await m.getByRole("dialog").boundingBox();
log("mobile sheet box", box && { x: box.x, y: Math.round(box.y), w: box.width, h: Math.round(box.height) });
log("mobile overflow", await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await m.screenshot({ path: "shots/add-dog-mobile.png" });

await browser.close();
