// Prediction scoring — the same rules as the source site (and scripts/scrape.ts):
// 1 point per correct pick submitted before that round's cutoff; after it, lateRoundPoints[round].
import { ACTUAL_WINNERS, LATE_ROUND_POINTS, ROUND_CUTOFFS, ROUND_SIZES } from "@/lib/bracket";

export function scorePicks(picks: string[], createdAt: string) {
  const created = Date.parse(createdAt);
  let offset = 0;
  const rounds = ROUND_SIZES.map((size, r) => {
    const results = ACTUAL_WINNERS.slice(offset, offset + size);
    const mine = picks.slice(offset, offset + size);
    offset += size;
    const settled = results.filter(Boolean).length;
    const matched = results.reduce((n, w, i) => n + (w && w === mine[i] ? 1 : 0), 0);
    const cutoff = ROUND_CUTOFFS[r] ? Date.parse(ROUND_CUTOFFS[r]!) : null;
    const eligible = cutoff === null ? true : created < cutoff;
    const perPick = eligible ? 1 : (LATE_ROUND_POINTS[r] ?? 0);
    return { round: size * 2, points: matched * perPick, perPick, matched, settled, eligible };
  });
  const correct = rounds.reduce((n, r) => n + r.matched, 0);
  const outOf = rounds.reduce((n, r) => n + r.settled, 0);
  return {
    correct,
    outOf,
    pctCorrect: outOf ? Math.round((correct / outOf) * 100) : 0,
    points: rounds.reduce((n, r) => n + r.points, 0),
    lateEntryLines: rounds
      .filter((r) => r.settled > 0 && !r.eligible)
      .map((r) => `Round ${r.round}: ${r.perPick} per correct pick · late entry`),
  };
}

/** Short note for the bracket page, from the cutoffs and late points (mirrors the source's notice). */
export function lateEntryNote() {
  const late = ROUND_CUTOFFS.map((c, r) => (c && Date.now() > Date.parse(c) ? r : -1)).filter((r) => r >= 0);
  if (!late.length) return null;
  const parts = late.map((r) => `Round ${ROUND_SIZES[r] * 2} picks earn ${LATE_ROUND_POINTS[r] ?? 0}`);
  return `Late entry: ${parts.join(", ")} per correct pick. Later rounds earn 1 point each before their cutoff.`;
}
