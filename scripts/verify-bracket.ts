/**
 * End-to-end check of /bracket: pick all 63 → one champion; change an early pick → dependents cleared;
 * persistence; undo; submit → appears on /predictions; read-only ?user= view; replace confirm; mobile.
 *   pnpm tsx scripts/verify-bracket.ts
 * Leaves a test bracket for @qa_bracket_test in uploads/brackets.json (gitignored).
 */
import { chromium, type Page } from "playwright";
import { champion, isCompleteValid, matchupDogs, ROUND_OFFSET, type Picks } from "@/lib/bracket";
import { getDog } from "@/lib/dogs";

const BASE = "http://localhost:3000";
const HANDLE = "qa_bracket_test";
const log = (label: string, value: unknown) =>
  console.log(`${label.padEnd(46)} ${typeof value === "string" ? value : JSON.stringify(value)}`);

const stored = (p: Page) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("fdod-bracket-v1") ?? "null")?.picks ?? null) as Promise<Picks | null>;
const countText = (p: Page) => p.getByRole("status").filter({ hasText: /of 63 picked/ }).locator("p").first().innerText();

async function pickFirstSide(p: Page) {
  const before = await countText(p);
  await p.locator("#matchups button", { hasText: /^Pick / }).first().click();
  await p.waitForFunction((b) => !document.body.innerText.includes(b), before, { timeout: 5000 });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
const page = await ctx.newPage();
await page.goto(`${BASE}/bracket`, { waitUntil: "load" });
await page.waitForTimeout(1200);

log("start", `${await countText(page)} · CTA “${(await page.getByRole("link", { name: /Start picking|Open matchups/ }).innerText()).trim()}”`);
const firstCard = (await page.locator("#matchups [role=group]").getAttribute("aria-label")) ?? "";
log("first featured matchup", firstCard);
log("R64 pairs = data (dNNa vs dNNb)", (() => {
  const wrong = [];
  for (let m = 0; m < 32; m++) {
    const [a, b] = matchupDogs(Array(63).fill(null), m);
    if (a !== `d${String(m + 1).padStart(2, "0")}a` || b !== `d${String(m + 1).padStart(2, "0")}b`) wrong.push(m + 1);
  }
  return wrong.length ? `mismatch ${wrong}` : `all 32 ok (match 1 = ${getDog("d01a").name} vs ${getDog("d01b").name})`;
})());

// ---- 1 pick, undo via toast, then keyboard pick
await pickFirstSide(page);
log("after 1 pick", `${await countText(page)} · CTA “${(await page.getByRole("link", { name: /Open matchups/ }).innerText()).trim()}”`);
await page.getByRole("button", { name: "Undo" }).click();
await page.waitForTimeout(300);
log("Undo (toast)", await countText(page));
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(900);
log("→ key picks right dog", `${await countText(page)} · stored[0]=${(await stored(page))?.[0]}`);
await page.keyboard.press("Backspace");
await page.waitForTimeout(300);
log("Backspace undoes", await countText(page));

// ---- pick all 63 (always the left dog)
const t0 = Date.now();
for (let i = 0; i < 63; i++) await pickFirstSide(page);
const picks = (await stored(page))!;
log(`picked all 63 in ${((Date.now() - t0) / 1000).toFixed(0)} s`, await countText(page));
log("valid complete bracket", isCompleteValid(picks));
log("exactly one champion", `${champion(picks)} = ${getDog(champion(picks)!).name}`);
await page.getByText("Your champion", { exact: true }).waitFor();
log("champion reveal shown", await page.locator("h2.display").filter({ hasText: getDog(champion(picks)!).name }).count());
log("CTA now", (await page.getByRole("button", { name: /Review & submit/ }).innerText()).trim());
const marks = await page.evaluate(() => ({
  correct: document.querySelectorAll('[aria-label="correct"]').length,
  wrong: document.querySelectorAll('[aria-label="wrong"]').length,
}));
log("full bracket real-result marks", marks);
await page.screenshot({ path: "shots/bracket-champion.png", fullPage: false });
await page.locator("#matchups").screenshot({ path: "shots/bracket-review.png" });

// ---- persistence
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(1200);
log("after reload", await countText(page));

// ---- change an early pick → dependents cleared (with confirm)
const before = (await stored(page))!;
await page.getByTitle(/Edit match: Sunshine vs Berry/).last().click(); // Berry's row in match 1
await page.waitForTimeout(600);
await page.locator("#matchups button", { hasText: "Pick Berry" }).click();
const dialog = page.getByRole("alertdialog");
await dialog.waitFor();
log("confirm text", await dialog.locator("#confirm-body").innerText());
await dialog.getByRole("button", { name: "Change pick" }).click();
await page.waitForTimeout(900);
const after = (await stored(page))!;
const cleared = before.map((p, i) => (p && !after[i] ? i : -1)).filter((i) => i >= 0);
log("after change", `${await countText(page)} · match 1 now ${after[0]}`);
log("cleared slots (R32 m1, R16 m1, QF m1, SF m1, Final)", cleared.map((i) => `${i}`).join(","));
log("expected", [ROUND_OFFSET[1], ROUND_OFFSET[2], ROUND_OFFSET[3], ROUND_OFFSET[4], ROUND_OFFSET[5]].join(","));
log("untouched picks kept", before.filter((p, i) => p && after[i] === p).length);

// re-complete (5 picks)
for (let i = 0; i < 5; i++) await pickFirstSide(page);
const final = (await stored(page))!;
log("re-completed", `${await countText(page)} · champion ${getDog(champion(final)!).name}`);

// ---- submit
await page.getByLabel(/Username/).fill(`@${HANDLE}`);
await page.getByLabel(/Why this dog/).fill("QA run: picked the left dog every time.");
await page.getByRole("button", { name: /Submit my bracket/ }).click();
const replace = page.getByRole("alertdialog");
if (await replace.isVisible().catch(() => false)) await replace.getByRole("button", { name: "Replace it" }).click();
await page.getByText("Bracket submitted!").waitFor({ timeout: 8000 });
log("submit", "Bracket submitted! 🐾");
await page.screenshot({ path: "shots/bracket-submitted.png" });

// ---- appears on Predictions
await page.getByRole("link", { name: /View on Predictions/ }).click();
await page.waitForURL(/\/predictions\?user=/);
const card = page.locator("#panel-all article").first();
await card.waitFor({ timeout: 8000 });
log("/predictions?user= → first card", (await card.innerText()).replace(/\s+/g, " ").slice(0, 170));
await page.screenshot({ path: "shots/bracket-on-predictions.png" });
await page.goto(`${BASE}/predictions`, { waitUntil: "load" });
await page.waitForTimeout(800);
log("latest feed, first card", (await page.locator("#panel-all article header a").first().innerText()).trim());
log("public predictions pill", await page.locator("header p").first().innerText());

// ---- read-only view + View bracket link
await page.locator("#panel-all article").first().getByRole("link", { name: "View bracket" }).click();
await page.waitForURL(/\/bracket\?user=/);
await page.waitForTimeout(800);
log("read-only view title", await page.locator("h1").innerText());
log("read-only has Pick buttons?", await page.locator("button", { hasText: /^Pick / }).count());
await page.goto(`${BASE}/bracket?user=sameererror_`, { waitUntil: "load" });
log("scraped bracket ?user=sameererror_", `${await page.locator("h1").innerText()} · ${await page.locator("h2.display").innerText()}`);

// ---- re-submit → replace confirm
await page.goto(`${BASE}/bracket`, { waitUntil: "load" });
await page.waitForTimeout(800);
await page.getByLabel(/Username/).fill(HANDLE);
await page.getByRole("button", { name: /Submit my bracket/ }).click();
await page.getByRole("alertdialog").waitFor();
log("re-submit same username → confirm", await page.getByRole("alertdialog").locator("#confirm-body").innerText());
await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();

// ---- mobile
for (const [w, h] of [[375, 812], [768, 1024]]) {
  const m = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/bracket`, { waitUntil: "load" });
  await mp.waitForTimeout(1200);
  log(`mobile ${w}px overflow`, await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await mp.screenshot({ path: `shots/bracket-${w}.png`, fullPage: true });
  await m.close();
}
await browser.close();
