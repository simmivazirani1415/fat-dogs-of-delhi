// Server-only helpers over data/predictions.json + data/prediction-leaderboard.json, merged with
// brackets submitted on this site (bracketStore). Client components get trimmed slices (no 63-pick
// arrays) via the page or /api routes.
import { loadPredictionLeaderboard, loadPredictions, type Prediction, type ScoreRow } from "@/lib/data";
import { stripAt } from "@/lib/format";
import { scorePicks } from "@/lib/scoring";
import { bracketStore, type BracketSubmission } from "@/lib/submissions";

export const PAGE_SIZE = 24;

export type PredictionCard = Omit<Prediction, "picks">;
export type CompactScoreRow = Omit<ScoreRow, "profileUrl">;

const trim = ({ picks: _picks, ...rest }: Prediction): PredictionCard => rest;

const IST_DATETIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
});
const profileUrl = (platform: "instagram" | "x", handle: string) =>
  (platform === "x" ? "https://x.com/" : "https://www.instagram.com/") + encodeURIComponent(handle);

function fromSubmission(b: BracketSubmission): Prediction {
  return {
    id: `local:${b.handleKey}`,
    handle: b.handle,
    handleKey: b.handleKey,
    platform: b.platform,
    profileUrl: profileUrl(b.platform, b.handle),
    champion: b.champion,
    comment: b.note || null,
    createdAt: b.createdAt,
    createdLabel: IST_DATETIME.format(new Date(b.createdAt)).replace(/\b(am|pm)\b/i, (m) => m.toLowerCase()),
    rank: null, // ranks come from the source's standings; new brackets are pending
    ...scorePicks(b.picks, b.createdAt),
    picks: b.picks,
  };
}

/** Site submissions (newest first) followed by the scraped feed, minus anyone who re-submitted here. */
async function allPredictions() {
  const [data, local] = await Promise.all([loadPredictions(), bracketStore.list()]);
  const mine = local.map(fromSubmission).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const replaced = new Set(mine.map((p) => p.handleKey));
  return { data, items: [...mine, ...data.items.filter((p) => !replaced.has(p.handleKey))], localCount: mine.length };
}

export async function predictionsPage(offset = 0, limit = PAGE_SIZE) {
  const { items } = await allPredictions();
  return {
    items: items.slice(offset, offset + limit).map(trim),
    nextOffset: offset + limit < items.length ? offset + limit : null,
    totalItems: items.length,
  };
}

/** Case-insensitive, leading @ stripped; exact handle matches first. */
export async function searchPredictions(query: string, limit = 60) {
  const q = stripAt(query);
  if (!q) return [];
  const { items } = await allPredictions();
  const hits = items.filter((p) => p.handleKey.includes(q) || p.handle.toLowerCase().includes(q));
  hits.sort((a, b) => Number(b.handleKey === q) - Number(a.handleKey === q));
  return hits.slice(0, limit).map(trim);
}

export async function predictionsMeta() {
  const { data, localCount } = await allPredictions();
  return { total: data.total + localCount, updatedLabel: data.updatedLabel, notice: data.notice };
}

/** A full bracket for the read-only /bracket?user= view (site submission first, then the scraped board). */
export async function findBracket(user: string) {
  const key = stripAt(user);
  if (!key) return null;
  const local = await bracketStore.get(key);
  if (local) return { handle: local.handle, platform: local.platform, note: local.note, picks: local.picks, champion: local.champion, createdAt: local.createdAt, source: "site" as const };
  const data = await loadPredictions();
  const p = data.items.find((x) => x.handleKey === key);
  return p ? { handle: p.handle, platform: p.platform, note: p.comment ?? "", picks: p.picks, champion: p.champion, createdAt: p.createdAt, source: "board" as const } : null;
}

export async function scoreBoard() {
  const data = await loadPredictionLeaderboard();
  return {
    rankedCount: data.rankedCount,
    howPointsWork: data.howPointsWork,
    rows: data.rows.map(({ profileUrl: _u, ...r }) => r) as CompactScoreRow[],
  };
}
