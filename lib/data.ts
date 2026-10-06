// Typed access to the scraped JSON in /data. Import from server components only —
// predictions.json is several MB; pass slices down to client components.
import leaderboardJson from "@/data/leaderboard.json";
import tournamentJson from "@/data/tournament.json";
import { getDog, type Dog } from "@/lib/dogs";

export type LeaderboardRow = { dogId: string; rank: number; picks: number; pct: number };
export type Leaderboard = {
  publicPredictions: number;
  updatedLabel: string;
  asOf: string;
  topContender: { dogId: string; count: number; of: number; pct: number };
  rows: LeaderboardRow[];
};

export type Platform = "instagram" | "x";

export type Prediction = {
  id: string;
  handle: string;
  handleKey: string;
  platform: Platform;
  profileUrl: string;
  champion: string;
  comment: string | null;
  createdAt: string;
  createdLabel: string;
  rank: number | null;
  correct: number;
  outOf: number;
  pctCorrect: number;
  points: number;
  lateEntryLines: string[];
  picks: string[];
};
export type Predictions = { total: number; updatedLabel: string; notice: string; asOf: string; items: Prediction[] };

export type ScoreRow = {
  rank: number;
  handle: string;
  handleKey: string;
  platform: Platform;
  profileUrl: string;
  champion: string;
  correct: number;
  outOf: number;
  pctCorrect: number;
  points: number;
};
export type PredictionLeaderboard = {
  rankedCount: number;
  confirmedMatches: number;
  generatedAt: string;
  howPointsWork: { text: string; cutoffs: string; updated: string };
  rows: ScoreRow[];
};

export type Match = { id: string; dogs: (string | null)[]; winner: string | null };
export type Tournament = {
  updatedAt: string;
  confirmed: number;
  total: number;
  confirmedLabel: string;
  nextLabel: string;
  rounds: { key: string; label: string; short: string; matchCount: number; confirmed: number; matches: Match[] }[];
};

export type MapPin = {
  id: string;
  name: string;
  place: string;
  lat: number;
  lng: number;
  precision: "approximate" | "exact";
  platform: Platform | null;
  handle: string | null;
  profileUrl: string | null;
  mediaType: string;
  mediaUrl: string;
  thumb: string | null;
  createdAt: string;
};

export const leaderboard = leaderboardJson as Leaderboard;
export const tournament = tournamentJson as Tournament;

export type RankedDog = LeaderboardRow & { dog: Dog };
export const rankedDogs = (): RankedDog[] => leaderboard.rows.map((r) => ({ ...r, dog: getDog(r.dogId) }));
export const topDogs = (n: number) => rankedDogs().slice(0, n);

// Large files are loaded lazily so pages that don't need them don't pay for them.
export const loadPredictions = async () => (await import("@/data/predictions.json")).default as Predictions;
export const loadPredictionLeaderboard = async () =>
  (await import("@/data/prediction-leaderboard.json")).default as PredictionLeaderboard;
export const loadMapPins = async () =>
  (await import("@/data/map-dogs.json")).default as { totalDogs: number; pins: MapPin[] };
export const loadAreaCoords = async () =>
  (await import("@/data/area-coords.json")).default as Record<string, { lat: number; lng: number } | null>;
