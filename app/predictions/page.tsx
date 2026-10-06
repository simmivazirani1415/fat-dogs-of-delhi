import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { AllPredictions } from "@/components/predictions/AllPredictions";
import { PredictionsTabs } from "@/components/predictions/PredictionsTabs";
import { ScoreTable } from "@/components/predictions/ScoreTable";
import { loadPredictionLeaderboard, tournament } from "@/lib/data";
import { predictionsMeta, predictionsPage } from "@/lib/predictions";

export const metadata: Metadata = {
  title: { absolute: "Fat Dogs of Delhi Predictions & Scores" },
  description:
    "Browse Fat Dogs of Delhi prediction brackets. Find your Instagram or Twitter username, see correct picks and points, and share your champion pick.",
  alternates: { canonical: "/predictions" },
};

export default async function PredictionsPage({ searchParams }: { searchParams: Promise<{ view?: string; user?: string }> }) {
  const { view, user } = await searchParams;
  const [meta, first, board] = await Promise.all([predictionsMeta(), predictionsPage(0), loadPredictionLeaderboard()]);

  return (
    <div className="page-shell pt-10 md:pt-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <h1 className="display text-[44px] md:text-[80px]">Predictions</h1>
          <p className="rounded-full bg-yellow-soft px-5 py-2.5 text-[16px] font-semibold md:px-6 md:py-3 md:text-[19px]">
            <CountUp value={meta.total} /> public predictions
          </p>
        </div>
        <Link
          href="/"
          className="flex h-12 items-center gap-3 rounded-full border border-ink/15 bg-surface px-6 text-[16px] font-medium transition-colors hover:bg-bg-soft"
        >
          <ArrowLeft aria-hidden className="size-5" /> Back to home
        </Link>
      </header>

      <PredictionsTabs
        initial={view === "leaderboard" ? "leaderboard" : "all"}
        all={
          <AllPredictions
            initial={first.items}
            initialNextOffset={first.nextOffset}
            notice={meta.notice}
            updatedLabel={meta.updatedLabel}
            tournament={tournament}
            initialQuery={user ?? ""}
          />
        }
        board={<ScoreTable rankedCountHint={board.rankedCount} />}
      />
    </div>
  );
}
