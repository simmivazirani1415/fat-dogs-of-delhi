// Bracket model shared by the My bracket page (client) and /api/brackets (server).
// A bracket is 63 picks in the source's order: 32 Round-of-64 winners (match 1→32), then 16, 8, 4, 2, 1.
// picks[62] is the champion. Unpicked slots are null.
import tournamentJson from "@/data/tournament.json";
import { dogs } from "@/lib/dogs";

export const ROUND_SIZES = [32, 16, 8, 4, 2, 1] as const;
export const ROUNDS = [
  { key: "r64", label: "Round of 64", short: "R64", sub: "64 starting dogs" },
  { key: "r32", label: "Round of 32", short: "R32", sub: "32 winners" },
  { key: "r16", label: "Round of 16", short: "R16", sub: "16 winners" },
  { key: "qf", label: "Quarter-finals", short: "QF", sub: "Top 8" },
  { key: "sf", label: "Semi-finals", short: "SF", sub: "Top 4" },
  { key: "final", label: "Final", short: "Final", sub: "Top 2" },
] as const;
export const TOTAL_PICKS = 63;

/** flat index where each round starts: [0, 32, 48, 56, 60, 62] */
export const ROUND_OFFSET = ROUND_SIZES.map((_, r) => ROUND_SIZES.slice(0, r).reduce((a, b) => a + b, 0));

export type Picks = (string | null)[];
export type Matchup = { index: number; round: number; match: number; dogs: [string | null, string | null] };

/** Round-of-64 pairs straight from the data: match NN = dNNa vs dNNb. */
export const R64_PAIRS: [string, string][] = Array.from({ length: 32 }, (_, m) => {
  const n = String(m + 1).padStart(2, "0");
  return [`d${n}a`, `d${n}b`];
});

// sanity: the pairs must exist in dogs.json
const known = new Set(dogs.map((d) => d.id));
for (const [a, b] of R64_PAIRS) if (!known.has(a) || !known.has(b)) throw new Error(`Missing R64 dog ${a}/${b}`);

export const emptyPicks = (): Picks => Array<string | null>(TOTAL_PICKS).fill(null);

export const roundOf = (index: number) => ROUND_OFFSET.findLastIndex((o) => index >= o);

/** The two dogs in a matchup, given the user's earlier picks. */
export function matchupDogs(picks: Picks, index: number): [string | null, string | null] {
  const r = roundOf(index);
  const m = index - ROUND_OFFSET[r];
  if (r === 0) return R64_PAIRS[m];
  const prev = ROUND_OFFSET[r - 1];
  return [picks[prev + m * 2], picks[prev + m * 2 + 1]];
}

export function matchups(picks: Picks): Matchup[] {
  return Array.from({ length: TOTAL_PICKS }, (_, index) => {
    const round = roundOf(index);
    return { index, round, match: index - ROUND_OFFSET[round] + 1, dogs: matchupDogs(picks, index) };
  });
}

/** Set a pick and clear every later pick that no longer has its dog in its matchup. */
export function applyPick(picks: Picks, index: number, dog: string | null): { picks: Picks; cleared: number[] } {
  const next = [...picks];
  next[index] = dog;
  const cleared: number[] = [];
  for (let i = ROUND_OFFSET[roundOf(index) + 1] ?? TOTAL_PICKS; i < TOTAL_PICKS; i++) {
    const p = next[i];
    if (p && !matchupDogs(next, i).includes(p)) {
      next[i] = null;
      cleared.push(i);
    }
  }
  return { picks: next, cleared };
}

/** How many later picks a change would clear (for the confirm prompt). */
export const clearsIfChanged = (picks: Picks, index: number, dog: string) =>
  picks[index] && picks[index] !== dog ? applyPick(picks, index, dog).cleared.length : 0;

export const pickedCount = (picks: Picks) => picks.filter(Boolean).length;
export const champion = (picks: Picks) => picks[TOTAL_PICKS - 1];

/** A round is unlocked when every earlier round is fully picked. */
export function unlockedRound(picks: Picks) {
  for (let r = 0; r < ROUND_SIZES.length; r++) {
    const start = ROUND_OFFSET[r];
    for (let i = start; i < start + ROUND_SIZES[r]; i++) if (!picks[i]) return r;
  }
  return ROUND_SIZES.length; // all picked → champion
}

/** First unpicked matchup whose two dogs are known. */
export const nextOpen = (picks: Picks) =>
  matchups(picks).find((m) => !picks[m.index] && m.dogs[0] && m.dogs[1])?.index ?? null;

/** Full validity check (server side): 63 picks, each one of its matchup's two dogs. */
export function isCompleteValid(picks: unknown): picks is string[] {
  if (!Array.isArray(picks) || picks.length !== TOTAL_PICKS) return false;
  for (let i = 0; i < TOTAL_PICKS; i++) {
    const p = picks[i];
    if (typeof p !== "string" || !matchupDogs(picks as Picks, i).includes(p)) return false;
  }
  return true;
}

// ---------------------------------------------------------------- real results

type TMatch = { id: string; dogs: (string | null)[]; winner: string | null };
const t = tournamentJson as unknown as {
  rounds: { matches: TMatch[] }[];
  roundCutoffs: (string | null)[];
  lateRoundPoints: number[];
};

/** Real winners in the same flat order (null = not decided yet). */
export const ACTUAL_WINNERS: (string | null)[] = t.rounds.flatMap((r) => r.matches.map((m) => m.winner));
export const ROUND_CUTOFFS = t.roundCutoffs;
export const LATE_ROUND_POINTS = t.lateRoundPoints;

/**
 * Real result for this slot, if the real matchup had the same two dogs the user is choosing between.
 * (Later rounds only compare when the user's matchup matches reality.)
 */
export function realResult(picks: Picks, index: number): string | null {
  const winner = ACTUAL_WINNERS[index];
  if (!winner) return null;
  const real = t.rounds[roundOf(index)].matches[index - ROUND_OFFSET[roundOf(index)]].dogs;
  const mine = matchupDogs(picks, index);
  return mine.includes(winner) && real.includes(mine[0]) && real.includes(mine[1]) ? winner : null;
}
