/**
 * Functional check for /predictions: card search, Load more, tab URL sync, rank search (incl. a deep,
 * virtualised row), not-found toast, How points work, Results modal.   pnpm tsx scripts/verify-predictions.ts
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const log = (label: string, value: unknown) => console.log(`${label.padEnd(34)} ${typeof value === "string" ? value : JSON.stringify(value)}`);
const cards = () => page.locator("#panel-all article");

await page.goto(`${BASE}/predictions`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
log("cards on load", await cards().count());

// --- Load more (twice)
const more = page.getByRole("button", { name: "Load more predictions" });
await more.click();
await page.waitForFunction(() => document.querySelectorAll("#panel-all article").length >= 48);
log("after 1× Load more", await cards().count());
await more.click();
await page.waitForFunction(() => document.querySelectorAll("#panel-all article").length >= 72);
const handles = await cards().locator("header a").allInnerTexts();
log("after 2× Load more", `${await cards().count()} cards, ${new Set(handles).size} unique handles`);

// --- Search a real username (with @, mixed case)
await page.getByLabel("Search by Instagram or X username").fill("@SameerError_");
await page.getByRole("button", { name: "Search", exact: true }).click();
await page.waitForFunction(() => document.querySelector("#panel-all h2")?.textContent?.startsWith("Results"));
const first = cards().first();
log("search @SameerError_ → results", await cards().count());
log("  first card", (await first.innerText()).replace(/\s+/g, " ").slice(0, 150));
await page.screenshot({ path: "shots/predictions-search.png" });

// --- No match → sleepy dog
await page.getByLabel("Search by Instagram or X username").fill("nobody_here_zzz");
await page.getByRole("button", { name: "Search", exact: true }).click();
await page.getByText("No one by that name yet.").waitFor();
log("search nobody_here_zzz", "empty state shown");

// --- Results & next matchups
await page.getByRole("button", { name: /Results & next matchups/ }).click();
const dialog = page.getByRole("dialog");
await dialog.waitFor();
log("results modal", (await dialog.locator("p").first().innerText()).replace(/\s+/g, " "));
await page.keyboard.press("Escape");
await dialog.waitFor({ state: "detached" });

// --- Tab switch + URL sync
await page.getByRole("tab", { name: "Prediction leaderboard" }).click();
log("URL after tab click", new URL(page.url()).search);
await page.locator("[data-score-row]").first().waitFor();
log("rendered score rows (virtualised)", `${await page.locator("[data-score-row]").count()} in DOM of ${await page.locator("[aria-rowcount]").getAttribute("aria-rowcount")}`);

// --- How points work
await page.getByRole("button", { name: "How points work" }).click();
await page.locator("#points-rules").waitFor();
log("How points work", (await page.locator("#points-rules").innerText()).replace(/\s+/g, " ").slice(0, 120) + "…");

// --- Find your rank: deep row (virtualised) + not-ranked toast
const rankInput = page.getByLabel("Find your rank");
await rankInput.fill("@soham9e");
await rankInput.press("Enter");
const deep = page.locator('[data-score-row="soham9e"]');
await deep.waitFor({ timeout: 4000 });
await page.waitForTimeout(250);
const box = await deep.boundingBox();
log("find @soham9e", `${(await deep.innerText()).replace(/\s+/g, " ")} | in view: ${!!box && box.y > 0 && box.y + box.height < 900} | glowing: ${await deep.evaluate((el) => el.classList.contains("is-glowing"))}`);
await page.screenshot({ path: "shots/predictions-rank-search.png" });

await rankInput.fill("sameererror_");
await rankInput.press("Enter");
const toast = page.getByText(/^Not ranked yet/);
await toast.waitFor({ timeout: 3000 });
log("find sameererror_ (late entry)", await toast.innerText());

// --- Back to All tab
await page.getByRole("tab", { name: "All predictions" }).click();
log("URL after switching back", new URL(page.url()).search || "(no query)");
await browser.close();
