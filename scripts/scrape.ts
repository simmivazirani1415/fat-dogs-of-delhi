/**
 * Scrapes https://fatdogsofdelhi.wedevit.in/ into /data and downloads photos into /public.
 *
 *   pnpm scrape            # refresh data, download missing images
 *   pnpm scrape --force    # also re-download images that already exist
 *   pnpm scrape --no-map-media   # skip downloading map-pin photos
 *
 * Where the data lives on the source site (discovered 5 Oct 2026):
 *   - 64 dogs + Round-of-64 pairings ......... literal in the main JS bundle (/assets/index-*.js)
 *   - tournament config (winners, cutoffs) ... literal in the main JS bundle
 *   - champion-pick counts ................... GET /api/analytics (also embedded as #public-data)
 *   - leaderboard tie ranks .................. pre-rendered /leaderboard HTML (used to verify our ranking rule)
 *   - predictions feed ....................... GET /api/predictions?cursor=… (24 per page, "Load more")
 *   - prediction standings ................... lazy chunk /assets/prediction-standings-*.js
 *   - map pins ............................... GET {worker}/dogs?before=… ; photos at {worker}/media/{id}
 * No headless browser is needed: everything the client renders comes from these sources.
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as cheerio from "cheerio";
import sharp from "sharp";

const BASE = "https://fatdogsofdelhi.wedevit.in";
const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data");
const DOG_IMG_DIR = path.join(ROOT, "public", "dogs");
const MAP_IMG_DIR = path.join(ROOT, "public", "map-dogs");
// Optional offline fallback: a previously captured snapshot. Override with SCRAPE_SEED=/path/to/file.json.
const SEED = process.env.SCRAPE_SEED ?? path.join(ROOT, "dogs seed-data.json");
const UA = "FatDogsOfDelhi-fan-rebuild/1.0 (scraper; contact: site owner)";

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const MAP_MEDIA = !args.has("--no-map-media");

const ROUND_SIZES = [32, 16, 8, 4, 2, 1];
const ROUND_KEYS = ["r64", "r32", "r16", "qf", "sf", "final"] as const;
const ROUND_LABELS = ["Round of 64", "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
const ROUND_SHORT = ["R64", "R32", "R16", "QF", "SF", "Final"];

const sources: { url: string; fetchedAt: string; note?: string }[] = [];
const warnings: string[] = [];

// ---------------------------------------------------------------- helpers

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, note?: string, tries = 3): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (note !== undefined) sources.push({ url, fetchedAt: new Date().toISOString(), ...(note ? { note } : {}) });
      return res;
    } catch (err) {
      if (i >= tries) throw new Error(`GET ${url} failed: ${(err as Error).message}`);
      await sleep(500 * i);
    }
  }
}
const getText = async (url: string, note = "") => (await get(url, note)).text();
const getJson = async <T>(url: string, note = "") => (await get(url, note)).json() as Promise<T>;

/** Evaluate a JS object/array literal pulled out of the bundle in an empty sandbox. */
function evalLiteral<T>(src: string): T {
  return vm.runInNewContext(`(${src})`, Object.create(null), { timeout: 1000 }) as T;
}

/** Return the balanced {...} or [...] literal that starts at `start`. Skips over template/quoted strings. */
function sliceBalanced(src: string, start: number): string {
  const open = src[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "`" || c === '"' || c === "'") {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
      continue;
    }
    if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0 && c === close) return src.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced literal in bundle");
}

/** "1,117" → 1117, "40%" → 40, "39.6 %" → 39.6 */
const num = (s: string) => Number(s.replace(/[,%\s]/g, ""));
const round1 = (n: number) => Math.round(n * 10) / 10;
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

const IST_TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const IST_DATETIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
});

async function writeJson(name: string, value: unknown) {
  await fs.writeFile(path.join(DATA, name), JSON.stringify(value, null, 2) + "\n");
  console.log(`  wrote data/${name}`);
}

async function download(url: string, dest: string, transform?: (buf: Buffer) => Promise<Buffer>) {
  if (!FORCE && existsSync(dest)) return "skipped" as const;
  const buf = Buffer.from(await (await get(url)).arrayBuffer());
  await fs.writeFile(dest, transform ? await transform(buf) : buf);
  return "downloaded" as const;
}

async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

/** Standard competition ranking (1, 2, 2, 4) over an already-sorted list. */
function competitionRanks<T>(sorted: T[], score: (x: T) => number): number[] {
  return sorted.map((x, i, arr) => {
    let j = i;
    while (j > 0 && score(arr[j - 1]) === score(x)) j--;
    return j + 1;
  });
}

// ---------------------------------------------------------------- types

type BundleDog = { id: string; name: string; area: string; image: string };
type BundleMatch = { id: string; dogs: [BundleDog, BundleDog] };
type TournamentConfig = {
  published: boolean;
  updatedAt: string;
  sourceUrl: string;
  roundCutoffs: (string | null)[];
  lateRoundPoints: number[];
  winners: (string | null | "")[];
};
type Analytics = {
  totalSubmissions: number;
  championCounts: { dogId: string; count: number }[];
  topContender: { dogId: string; count: number };
  asOf: string;
};
type FeedEntry = {
  id: string; handleKey: string; platform: "instagram" | "x"; handle: string; note: string;
  picks: string[]; champion: string; createdAt: string;
};
type Standing = {
  handle: string; handleKey: string; platform: "instagram" | "x"; champion: string;
  points: number; correct: number; settled: number; rank: number;
};
type StandingsChunk = {
  resultsUpdatedAt: string; cutoff: string; generatedAt: string; confirmedMatches: number;
  standings: Standing[]; totalRanked?: number;
};
type MapDog = {
  id: string; name: string; place: string; latitude: number; longitude: number;
  location_source: string; location_precision: string; platform: "instagram" | "x" | null;
  handle: string | null; media_type: string; created_at: number;
};

// ---------------------------------------------------------------- bracket maths (mirrors the source site)

function buildRounds(matches: BundleMatch[], winners: TournamentConfig["winners"]) {
  const rounds: { id: string; dogs: (string | null)[]; winner: string | null }[][] = [];
  let flat = 0;
  for (let r = 0; r < ROUND_SIZES.length; r++) {
    const prev = rounds[r - 1];
    const round = Array.from({ length: ROUND_SIZES[r] }, (_, m) => {
      const dogs = r === 0 ? matches[m].dogs.map((d) => d.id) : [prev[m * 2].winner, prev[m * 2 + 1].winner];
      const w = winners[flat++] || null;
      // only accept a winner that is actually in the match
      const winner = w && dogs.includes(w) ? w : null;
      return { id: `r${r + 1}-${String(m + 1).padStart(2, "0")}`, dogs, winner };
    });
    rounds.push(round);
  }
  return rounds;
}

/** Same scoring as the source ($r in their bundle): 1pt per correct pick before a round's cutoff, lateRoundPoints after. */
function scoreEntry(entry: FeedEntry, flatWinners: (string | null)[], cfg: TournamentConfig) {
  const created = Date.parse(entry.createdAt);
  let offset = 0;
  const rounds = ROUND_SIZES.map((size, r) => {
    const results = flatWinners.slice(offset, offset + size);
    const picks = entry.picks.slice(offset, offset + size);
    offset += size;
    const settled = results.filter(Boolean).length;
    const matched = results.reduce((n, w, i) => n + (w && w === picks[i] ? 1 : 0), 0);
    const cutoff = cfg.roundCutoffs[r] ? Date.parse(cfg.roundCutoffs[r]!) : null;
    const eligible = cutoff === null ? true : Number.isFinite(created) ? created < cutoff : null;
    const perPick = eligible ? 1 : eligible === false ? cfg.lateRoundPoints[r] ?? 0 : 0;
    return { round: ROUND_SIZES[r] * 2, points: matched * perPick, perPick, matched, settled, eligible };
  });
  const matched = rounds.reduce((n, r) => n + r.matched, 0);
  const settled = rounds.reduce((n, r) => n + r.settled, 0);
  return {
    correct: matched,
    outOf: settled,
    pctCorrect: settled ? Math.round((matched / settled) * 100) : 0,
    points: rounds.reduce((n, r) => n + r.points, 0),
    lateEntryLines: rounds
      .filter((r) => r.settled > 0 && r.eligible === false)
      .map((r) => `Round ${r.round}: ${r.perPick} per correct pick · late entry`),
  };
}

// ---------------------------------------------------------------- live scrape

async function scrapeLive() {
  console.log("→ Fetching homepage + bundle");
  const homeHtml = await getText(`${BASE}/`, "homepage: headline, #public-data analytics, bundle URL");
  const $home = cheerio.load(homeHtml);
  const bundlePath = $home('script[type="module"][src*="/assets/index-"]').attr("src");
  if (!bundlePath) throw new Error("Couldn't find the main bundle <script> on the homepage");
  const bundle = await getText(new URL(bundlePath, BASE).href, "main JS bundle: dogs, matches, tournament config");

  // 64 dogs in Round-of-64 match order
  const mStart = bundle.indexOf("[{id:`m01`");
  if (mStart < 0) throw new Error("Couldn't find the match list in the bundle");
  const matches = evalLiteral<BundleMatch[]>(sliceBalanced(bundle, mStart));

  // tournament config object (contains roundCutoffs + winners)
  const cfgKey = bundle.indexOf("{published:");
  if (cfgKey < 0) throw new Error("Couldn't find the tournament config in the bundle");
  const cfg = evalLiteral<TournamentConfig>(sliceBalanced(bundle, cfgKey));

  const howPointsText = bundle.match(/className:`people-scoring`,children:`([^`]+)`/)?.[1];
  const workerUrl = bundle.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0];
  const standingsChunk = bundle.match(/import\(`\.\/(prediction-standings-[\w-]+\.js)`\)/)?.[1];
  const scoredNotice = bundle.match(/children:\w+\?`(Round 32 is scored\.[^`]*)`/)?.[1];

  console.log("→ Fetching analytics");
  let analytics: Analytics;
  try {
    analytics = await getJson<Analytics>(`${BASE}/api/analytics`, "champion-pick counts (fresh)");
  } catch (e) {
    warnings.push(`/api/analytics failed (${(e as Error).message}); using #public-data embedded in the homepage`);
    analytics = JSON.parse($home("#public-data").text()).analytics;
  }

  console.log("→ Verifying tie-rank rule against /leaderboard HTML");
  const lbHtml = await getText(`${BASE}/leaderboard`, "pre-rendered leaderboard: display ranks incl. ties");
  const $lb = cheerio.load(lbHtml);
  const htmlSnapshot: Analytics = JSON.parse($lb("#public-data").text()).analytics;
  const htmlRanks = new Map<string, number>();
  $lb(".analytics-podium li, .analytics-rankings li").each((_, li) => {
    const img = $lb(li).find("img").first().attr("src") ?? "";
    const id = img.match(/\/dogs\/(d\d\d[ab])\./)?.[1];
    const rank = num($lb(li).find(".analytics-podium-step span, .analytics-rank").first().text());
    if (id && rank) htmlRanks.set(id, rank);
  });

  const dogOrder = matches.flatMap((m) => m.dogs.map((d) => d.id));
  const rankRows = (a: Analytics) => {
    const sorted = [...a.championCounts].sort(
      (x, y) => y.count - x.count || dogOrder.indexOf(x.dogId) - dogOrder.indexOf(y.dogId),
    );
    const ranks = competitionRanks(sorted, (x) => x.count);
    return sorted.map((x, i) => ({
      dogId: x.dogId,
      rank: ranks[i],
      picks: x.count,
      pct: a.totalSubmissions ? round1((x.count / a.totalSubmissions) * 100) : 0,
    }));
  };
  const snapshotRows = rankRows(htmlSnapshot);
  const mismatches = snapshotRows.filter((r) => htmlRanks.has(r.dogId) && htmlRanks.get(r.dogId) !== r.rank);
  if (htmlRanks.size < 3 || mismatches.length) {
    throw new Error(
      `Ranking rule doesn't reproduce the source's tie ranks (${mismatches.length} mismatches, ${htmlRanks.size} ranks read)`,
    );
  }
  console.log(`  ✓ ranking rule matches all ${htmlRanks.size} ranks on the pre-rendered page`);

  console.log("→ Fetching predictions feed (Load more until exhausted)");
  const feed: FeedEntry[] = [];
  let cursor: string | null = null;
  let feedAsOf = "";
  let pages = 0;
  do {
    const url = cursor ? `${BASE}/api/predictions?cursor=${encodeURIComponent(cursor)}` : `${BASE}/api/predictions`;
    const page: { entries: FeedEntry[]; nextCursor: string | null; asOf: string } = await getJson(url);
    feed.push(...page.entries);
    feedAsOf ||= page.asOf;
    cursor = page.nextCursor;
    pages++;
    if (pages % 20 === 0) console.log(`  … ${feed.length} predictions`);
    await sleep(120);
  } while (cursor && pages < 1000);
  sources.push({ url: `${BASE}/api/predictions?cursor=…`, fetchedAt: new Date().toISOString(), note: `${pages} pages` });
  console.log(`  ${feed.length} predictions over ${pages} pages`);

  console.log("→ Fetching prediction standings");
  if (!standingsChunk) throw new Error("Couldn't find the prediction-standings chunk name in the bundle");
  const chunkSrc = await getText(`${BASE}/assets/${standingsChunk}`, "prediction leaderboard standings chunk");
  const chunk = evalLiteral<StandingsChunk>(sliceBalanced(chunkSrc, chunkSrc.indexOf("{")));

  console.log("→ Fetching map pins");
  if (!workerUrl) throw new Error("Couldn't find the map worker URL in the bundle");
  const mapDogs: MapDog[] = [];
  let before: number | null = null;
  let totalDogs = 0;
  do {
    const page: { dogs: MapDog[]; nextCursor: number | null; totalDogs: number } = await getJson(
      `${workerUrl}/dogs${before ? `?before=${before}` : ""}`,
    );
    mapDogs.push(...page.dogs);
    totalDogs ||= page.totalDogs ?? 0; // only the first page reports the total
    before = page.nextCursor;
    await sleep(120);
  } while (before && (!totalDogs || mapDogs.length < totalDogs));
  sources.push({ url: `${workerUrl}/dogs?before=…`, fetchedAt: new Date().toISOString(), note: "map pins endpoint" });
  console.log(`  ${mapDogs.length} of ${totalDogs} map dogs`);

  return {
    homeHtml, matches, cfg, analytics, feed, feedAsOf, chunk, mapDogs, totalDogs, workerUrl,
    howPointsText, scoredNotice, rankRows,
  };
}

// ---------------------------------------------------------------- build outputs

async function buildFromLive(live: Awaited<ReturnType<typeof scrapeLive>>) {
  const { matches, cfg, analytics, feed, feedAsOf, chunk, mapDogs, workerUrl } = live;
  const rounds = buildRounds(matches, cfg.published ? cfg.winners : []);
  const flatWinners = rounds.flat().map((m) => m.winner);
  const confirmed = flatWinners.filter(Boolean).length;
  const nextRound = rounds.findIndex((r) => r.some((m) => !m.winner));

  // --- dogs.json
  const statusOf = (id: string) => {
    for (let r = 0; r < rounds.length; r++) {
      const m = rounds[r].find((x) => x.dogs.includes(id));
      if (!m) return { status: `out_${ROUND_KEYS[r - 1]}`, label: `Out in ${ROUND_SHORT[r - 1]}` };
      if (!m.winner) return { status: `in_${ROUND_KEYS[r]}`, label: `In ${ROUND_SHORT[r]}` };
      if (m.winner !== id) return { status: `out_${ROUND_KEYS[r]}`, label: `Out in ${ROUND_SHORT[r]}` };
    }
    return { status: "champion", label: "Champion" };
  };
  const dogs = matches.flatMap((m, i) =>
    m.dogs.map((d) => {
      const side = d.id.at(-1) as "a" | "b";
      const opponent = m.dogs.find((o) => o.id !== d.id)!.id;
      const s = statusOf(d.id);
      return {
        id: d.id, name: clean(d.name), area: clean(d.area), image: `/dogs/${d.id}.jpg`,
        roundOf64Match: i + 1, bracketSide: side, opponentId: opponent, status: s.status, statusLabel: s.label,
      };
    }),
  );

  // --- leaderboard.json
  const rows = live.rankRows(analytics);
  const leaderboard = {
    publicPredictions: analytics.totalSubmissions,
    updatedLabel: `Updated ${IST_TIME.format(new Date(analytics.asOf))} · refreshes every 30 minutes`,
    asOf: analytics.asOf,
    topContender: { ...analytics.topContender, of: analytics.totalSubmissions, pct: rows[0].pct },
    rows,
  };

  // --- tournament.json
  const tournament = {
    updatedAt: cfg.updatedAt,
    sourceUrl: cfg.sourceUrl,
    confirmed,
    total: flatWinners.length,
    confirmedLabel: `${confirmed} of ${flatWinners.length} results confirmed`,
    nextLabel: nextRound >= 0 ? `${ROUND_LABELS[nextRound]} is next` : "Tournament complete",
    roundCutoffs: cfg.roundCutoffs,
    lateRoundPoints: cfg.lateRoundPoints,
    rounds: rounds.map((ms, r) => ({
      key: ROUND_KEYS[r], label: ROUND_LABELS[r], short: ROUND_SHORT[r], matchCount: ms.length,
      confirmed: ms.filter((m) => m.winner).length, matches: ms,
    })),
  };

  // --- predictions.json
  const standingByHandle = new Map(chunk.standings.map((s) => [s.handleKey, s]));
  const profileUrl = (p: string, h: string) =>
    (p === "x" ? "https://x.com/" : "https://www.instagram.com/") + encodeURIComponent(h);
  const predictions = {
    total: analytics.totalSubmissions,
    updatedLabel: `Count updated ${IST_TIME.format(new Date(feedAsOf))} IST · refreshes every 30 minutes`,
    notice: confirmed > 0 && cfg.roundCutoffs[1]
      ? live.scoredNotice ?? "Round 32 is scored. New entries earn 0.5 per correct round-32 pick."
      : "Scores appear as results come in.",
    asOf: feedAsOf,
    items: feed.map((e) => {
      const rank = standingByHandle.get(e.handleKey || e.id)?.rank ?? null;
      return {
        id: e.id, handle: clean(e.handle), handleKey: e.handleKey, platform: e.platform,
        profileUrl: profileUrl(e.platform, e.handle), champion: e.champion, comment: clean(e.note) || null,
        createdAt: e.createdAt, createdLabel: IST_DATETIME.format(new Date(e.createdAt)).replace(/\b(am|pm)\b/i, (m) => m.toLowerCase()),
        rank, ...scoreEntry(e, flatWinners, cfg), picks: e.picks,
      };
    }),
  };

  // --- prediction-leaderboard.json
  const cutoffLine = cfg.roundCutoffs
    .slice(0, 2)
    .map((c, i) => (c ? `Round ${i === 0 ? 64 : 32} cutoff: ${IST_DATETIME.format(new Date(c))} IST` : null))
    .filter(Boolean)
    .join(" · ");
  const predictionLeaderboard = {
    rankedCount: chunk.totalRanked ?? chunk.standings.length,
    confirmedMatches: chunk.confirmedMatches,
    generatedAt: chunk.generatedAt,
    howPointsWork: {
      text: live.howPointsText ?? "",
      cutoffs: cutoffLine,
      updated: `Rankings updated ${IST_DATETIME.format(new Date(chunk.generatedAt))} IST.`,
    },
    rows: chunk.standings.map((s) => ({
      rank: s.rank, handle: clean(s.handle), handleKey: s.handleKey, platform: s.platform,
      profileUrl: profileUrl(s.platform, s.handle), champion: s.champion, correct: s.correct, outOf: s.settled,
      pctCorrect: s.settled ? Math.round((s.correct / s.settled) * 100) : 0, points: s.points,
    })),
  };

  // --- map-dogs.json
  const isImage = (t: string) => t.startsWith("image/");
  const mapJson = {
    endpoint: `${workerUrl}/dogs`,
    totalDogs: live.totalDogs,
    fetchedAt: new Date().toISOString(),
    pins: mapDogs.map((d) => ({
      id: d.id, name: clean(d.name), place: clean(d.place), lat: d.latitude, lng: d.longitude,
      precision: d.location_precision, locationSource: d.location_source,
      platform: d.platform, handle: d.handle ? clean(d.handle) : null,
      profileUrl: d.handle && d.platform ? profileUrl(d.platform, d.handle) : null,
      mediaType: d.media_type, mediaUrl: `${workerUrl}/media/${d.id}`,
      thumb: isImage(d.media_type) ? `/map-dogs/${d.id}.webp` : null,
      createdAt: new Date(d.created_at).toISOString(),
    })),
  };

  return { dogs, leaderboard, tournament, predictions, predictionLeaderboard, mapJson };
}

// ---------------------------------------------------------------- fallback (seed)

async function buildFromSeed() {
  const seed = JSON.parse(await fs.readFile(SEED, "utf8"));
  type SeedDog = {
    id: string; name: string; area: string; roundOf64Match: number; bracketSide: "a" | "b";
    leaderboardRank: number; championPicks: number; championPickPct: number; status: string;
  };
  const sd: SeedDog[] = seed.dogs;
  const dogs = sd
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => ({
      id: d.id, name: clean(d.name), area: clean(d.area), image: `/dogs/${d.id}.jpg`,
      roundOf64Match: d.roundOf64Match, bracketSide: d.bracketSide,
      opponentId: d.id.slice(0, 3) + (d.bracketSide === "a" ? "b" : "a"),
      status: d.status, statusLabel: d.status.replace(/_/g, " "),
    }));
  const rows = sd
    .slice()
    .sort((a, b) => a.leaderboardRank - b.leaderboardRank)
    .map((d) => ({ dogId: d.id, rank: d.leaderboardRank, picks: d.championPicks, pct: d.championPickPct }));
  const leaderboard = {
    publicPredictions: seed.leaderboard.publicPredictions,
    updatedLabel: seed.leaderboard.updatedLabel,
    asOf: seed._meta.capturedOn,
    topContender: seed.site.homepageTopContender,
    rows,
  };
  return {
    dogs, leaderboard,
    tournament: { ...seed.tournament, fromSeed: true },
    predictions: { total: seed.site.publicPredictionsHomepage, updatedLabel: "", notice: "", items: seed.predictionsSample },
    predictionLeaderboard: { rankedCount: 0, howPointsWork: { text: "", cutoffs: "", updated: "" }, rows: [] },
    mapJson: { endpoint: null, totalDogs: 0, pins: [] },
  };
}

// ---------------------------------------------------------------- tournament-dog coordinates

/**
 * The map endpoint only holds community uploads, so the 64 tournament dogs are placed by area.
 * Geocoded once via Nominatim (1 req/s, cached in data/area-coords.json; only missing areas are looked up).
 */
async function geocodeTournamentAreas(dogs: { area: string }[]) {
  const file = path.join(DATA, "area-coords.json");
  const cache: Record<string, { lat: number; lng: number; query: string } | null> = existsSync(file)
    ? JSON.parse(await fs.readFile(file, "utf8"))
    : {};
  // Satellite cities resolve wrongly with a ", Delhi" suffix; look them up as cities instead.
  const CITY_QUERIES: Record<string, string> = {
    Noida: "Noida, Uttar Pradesh", Meerut: "Meerut, Uttar Pradesh",
    Gurgaon: "Gurugram, Haryana", Faridabad: "Faridabad, Haryana",
    "GK 2 M-Block Market": "M Block Market, Greater Kailash",
  };
  // Not in OSM under these names; placed by hand.
  const FIXED: Record<string, { lat: number; lng: number; query: string }> = {
    "Vijaynagar, North Campus": { lat: 28.6965, lng: 77.2046, query: "manual: Vijay Nagar, near DU North Campus" },
    Ghaziabad: { lat: 28.6692, lng: 77.4538, query: "manual: Ghaziabad city centre (Nominatim returns the district)" },
  };
  for (const [area, query] of Object.entries(CITY_QUERIES)) if (cache[area]?.query !== query) delete cache[area];
  Object.assign(cache, FIXED);

  const todo = [...new Set(dogs.map((d) => d.area))].filter((a) => !(a in cache));
  if (todo.length) console.log(`→ Geocoding ${todo.length} tournament areas via Nominatim (1 req/s)`);
  // Delhi-NCR viewbox keeps "Rohini" / "North Campus" from resolving elsewhere in India.
  const viewbox = "76.8,29.1,77.9,28.2";
  for (const area of todo) {
    let hit: { lat: number; lng: number; query: string } | null = null;
    for (const q of CITY_QUERIES[area] ? [CITY_QUERIES[area]] : [`${area}, Delhi`, area]) {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in` +
        (CITY_QUERIES[area] ? "" : `&bounded=1&viewbox=${viewbox}`) +
        `&q=${encodeURIComponent(q)}`;
      try {
        const res: { lat: string; lon: string }[] = await getJson(url);
        if (res[0]) hit = { lat: Number(res[0].lat), lng: Number(res[0].lon), query: q };
      } catch (e) {
        warnings.push(`Geocode failed for "${q}": ${(e as Error).message}`);
      }
      await sleep(1100);
      if (hit) break;
    }
    cache[area] = hit;
  }
  for (const [area, hit] of Object.entries(cache))
    if (!hit) warnings.push(`No coordinates for area "${area}"; it will be left off the map`);
  if (todo.length)
    sources.push({ url: "https://nominatim.openstreetmap.org/search", fetchedAt: new Date().toISOString(), note: "tournament area geocodes" });
  await writeJson("area-coords.json", cache);
}

// ---------------------------------------------------------------- main

async function main() {
  await fs.mkdir(DATA, { recursive: true });
  await fs.mkdir(DOG_IMG_DIR, { recursive: true });
  await fs.mkdir(MAP_IMG_DIR, { recursive: true });

  let out: Awaited<ReturnType<typeof buildFromLive>> | Awaited<ReturnType<typeof buildFromSeed>>;
  let live = true;
  try {
    out = await buildFromLive(await scrapeLive());
  } catch (err) {
    live = false;
    if (!existsSync(SEED)) {
      // no snapshot available: keep the data already in data/ and stop
      console.error(`\n✗ Live scrape failed: ${(err as Error).message}\n  No offline snapshot at ${path.relative(ROOT, SEED)}; data/ left unchanged.`);
      process.exit(1);
    }
    warnings.push(`Live scrape failed: ${(err as Error).message}. Falling back to ${path.basename(SEED)}.`);
    console.warn(`\n⚠️  ${warnings.at(-1)}\n`);
    out = await buildFromSeed();
  }

  console.log("→ Writing data/");
  await writeJson("dogs.json", out.dogs);
  await writeJson("leaderboard.json", out.leaderboard);
  await writeJson("predictions.json", out.predictions);
  await writeJson("prediction-leaderboard.json", out.predictionLeaderboard);
  await writeJson("tournament.json", out.tournament);
  await writeJson("map-dogs.json", out.mapJson);

  console.log("→ Downloading 64 dog photos");
  const counts = { downloaded: 0, skipped: 0, failed: 0 };
  await pool(out.dogs, 6, async (d) => {
    try {
      counts[await download(`${BASE}/dogs/${d.id}.jpg`, path.join(DOG_IMG_DIR, `${d.id}.jpg`))]++;
    } catch (e) {
      counts.failed++;
      console.warn(`  ✗ ${d.id}: ${(e as Error).message}`);
    }
  });
  console.log(`  ${counts.downloaded} downloaded, ${counts.skipped} already present, ${counts.failed} failed`);

  // Tiny blurred previews for next/image placeholder="blur"
  const blur: Record<string, string> = {};
  for (const d of out.dogs) {
    const file = path.join(DOG_IMG_DIR, `${d.id}.jpg`);
    if (!existsSync(file)) continue;
    const buf = await sharp(file).resize(12, 12, { fit: "cover" }).jpeg({ quality: 50 }).toBuffer();
    blur[d.id] = `data:image/jpeg;base64,${buf.toString("base64")}`;
  }
  await writeJson("dog-blur.json", blur);

  if (MAP_MEDIA && out.mapJson.pins.length) {
    // Uploaded photos are ~200 KB each; store a 320px WebP thumbnail locally (the popup can load the original).
    console.log(`→ Downloading ${out.mapJson.pins.filter((p) => p.thumb).length} map-pin thumbnails`);
    const m = { downloaded: 0, skipped: 0, failed: 0 };
    await pool(out.mapJson.pins.filter((p) => p.thumb), 6, async (p) => {
      try {
        const r = await download(p.mediaUrl, path.join(ROOT, "public", p.thumb!), (buf) =>
          sharp(buf).rotate().resize(320, 320, { fit: "cover" }).webp({ quality: 72 }).toBuffer(),
        );
        m[r]++;
      } catch (e) {
        m.failed++;
        p.thumb = null; // marker falls back to a paw glyph
      }
    });
    console.log(`  ${m.downloaded} downloaded, ${m.skipped} already present, ${m.failed} failed`);
    if (m.failed) await writeJson("map-dogs.json", out.mapJson);
  }

  await geocodeTournamentAreas(out.dogs);

  await writeJson("_sources.json", {
    scrapedAt: new Date().toISOString(),
    live,
    base: BASE,
    mapEndpoint: out.mapJson.endpoint,
    mapEndpointDiscovery: "Read from the main JS bundle (workers.dev URL); paginated with ?before=<created_at>",
    sources,
    warnings,
  });

  // ---- validation (fail loudly)
  console.log("→ Validating");
  const errors: string[] = [];
  const ids = new Set(out.dogs.map((d) => d.id));
  if (out.dogs.length !== 64) errors.push(`expected 64 dogs, got ${out.dogs.length}`);
  if (ids.size !== 64) errors.push(`expected 64 unique ids, got ${ids.size}`);
  for (const r of out.leaderboard.rows) if (!ids.has(r.dogId)) errors.push(`leaderboard dogId ${r.dogId} not in dogs.json`);
  for (const d of out.dogs)
    if (!existsSync(path.join(DOG_IMG_DIR, `${d.id}.jpg`))) errors.push(`missing image public/dogs/${d.id}.jpg`);
  if (errors.length) {
    console.error("\n✗ Validation failed:\n  - " + errors.join("\n  - "));
    process.exit(1);
  }
  console.log(`  ✓ 64 dogs, 64 unique ids, ${out.leaderboard.rows.length} leaderboard rows resolve, all 64 images on disk`);
  if (warnings.length) console.warn("\n⚠️  Warnings:\n  - " + warnings.join("\n  - "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
