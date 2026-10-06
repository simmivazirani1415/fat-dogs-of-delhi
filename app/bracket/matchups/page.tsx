import type { Metadata } from "next";
import { MatchupsBoard } from "@/components/bracket/MatchupsBoard";
import { lateEntryNote } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "All matchups",
  description: "Pick a winner in every Fat Dogs of Delhi matchup, round by round, until one champion is left.",
  alternates: { canonical: "/bracket/matchups" },
};

export default function MatchupsPage() {
  return <MatchupsBoard note={lateEntryNote()} />;
}
