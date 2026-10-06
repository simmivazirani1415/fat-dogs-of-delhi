/**
 * /bracket/matchups: CTA navigation, neutral cards, picking, round unlock, shared storage with /bracket.
 *   pnpm tsx --tsconfig tsconfig.json scripts/verify-matchups.ts
 */
import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const log = (l: string, v: unknown) => console.log(`${l.padEnd(44)} ${typeof v === "string" ? v : JSON.stringify(v)}`);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

await p.goto(`${BASE}/`, { waitUntil: "load" });
await p.locator("nav").getByRole("link", { name: /Make your pick/ }).first().click();
await p.waitForURL(/\/bracket\/matchups/);
log("navbar Make your pick →", new URL(p.url()).pathname);
await p.goto(`${BASE}/bracket`, { waitUntil: "load" });
await p.waitForTimeout(800);
await p.getByRole("link", { name: /Start picking/ }).click();
await p.waitForURL(/\/bracket\/matchups/);
log("bracket hero CTA →", new URL(p.url()).pathname);
await p.goto(`${BASE}/bracket`, { waitUntil: "load" });
await p.getByRole("link", { name: /View all matchups/ }).click();
await p.waitForURL(/\/bracket\/matchups/);
log("bracket View all matchups →", new URL(p.url()).pathname);
await p.waitForTimeout(1000);

const cards = p.locator("main [role=group]");
log("R64 cards on page", await cards.count());
log("buttons pre-selected (aria-pressed=true)", await p.locator('main button[aria-pressed="true"]').count());
log("match 5 buttons (same-name dogs)", await cards.nth(4).locator("button").allInnerTexts());
log("R32 tab locked", await p.getByRole("button", { name: /Round of 32/ }).isDisabled());

// pick all 32 of R64 (left dog each time)
for (let i = 0; i < 32; i++) {
  await cards.nth(i).locator("button").first().click();
  await p.waitForFunction((n) => document.querySelectorAll('main button[aria-pressed="true"]').length >= n, i + 1, { timeout: 4000 });
}
log("after 32 picks: pressed buttons", await p.locator('main button[aria-pressed="true"]').count());
await p.waitForTimeout(900);
log("auto-advanced round heading", await p.locator("#round-title").innerText());
log("R32 cards", await cards.count());
log("progress", await p.getByText(/of 63 picked/).first().innerText());

// change match 1 pick in R64 after picking an R32 that depends on it
await cards.nth(0).locator("button").first().click(); // R32 m1 = winner of m1 (Sunshine)
await p.waitForTimeout(800);
await p.getByRole("button", { name: /Round of 64/ }).click();
await p.waitForTimeout(300);
await cards.nth(0).locator("button").nth(1).click(); // switch to Berry
const dlg = p.getByRole("alertdialog");
await dlg.waitFor();
log("change confirm", await dlg.locator("#confirm-body").innerText());
await dlg.getByRole("button", { name: "Change pick" }).click();
await p.waitForTimeout(900);
log("progress after change", await p.getByText(/of 63 picked/).first().innerText());

// shared storage with /bracket
await p.goto(`${BASE}/bracket`, { waitUntil: "load" });
await p.waitForTimeout(800);
log("/bracket sees same progress", await p.getByText(/of 63 picked/).first().innerText());
await p.screenshot({ path: "shots/matchups-after.png" });
await p.evaluate(() => localStorage.removeItem("fdod-bracket-v1"));

const m = await b.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
await m.goto(`${BASE}/bracket/matchups`, { waitUntil: "load" });
await m.waitForTimeout(1000);
log("mobile 375 overflow", await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await m.screenshot({ path: "shots/matchups-375.png" });
await b.close();
