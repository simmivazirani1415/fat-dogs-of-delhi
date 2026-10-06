import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CountUp } from "@/components/CountUp";
import { CTAButton } from "@/components/CTAButton";
import { LeaderboardView, LeaderboardWithParams } from "@/components/leaderboard/LeaderboardView";
import { leaderboard } from "@/lib/data";

export const metadata: Metadata = {
  title: { absolute: "Most-Picked Dogs & Champion Leaderboard | Fat Dogs of Delhi" },
  description:
    "See the most-picked Fat Dogs of Delhi champions, their names, neighbourhoods and share of submitted predictions. Compare favourites before making your bracket.",
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  const entries = leaderboard.rows;
  const total = leaderboard.publicPredictions;

  return (
    <div className="page-shell pt-10 md:pt-12">
      <header className="mx-auto flex max-w-[1260px] flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="display text-[44px] md:text-[88px]">Leaderboard</h1>
          <p className="mt-2 text-[22px] font-semibold text-[#8A5A43] md:text-[28px]">Most-picked champions</p>
          <p className="mt-1 text-[14px] text-ink-2">{leaderboard.updatedLabel}</p>
        </div>
        <div className="lg:pt-3 lg:text-right">
          <p className="inline-flex items-center gap-4 rounded-[28px] bg-yellow-soft px-7 py-4 md:px-9 md:py-5">
            <CountUp value={total} className="text-[40px] leading-none font-extrabold tracking-[-0.02em] md:text-[56px]" />
            <span className="text-[17px] font-medium md:text-[20px]">public predictions</span>
          </p>
          <p className="mt-3 text-[14px] text-ink-2">
            Based on championship picks.{" "}
            <Link
              href="/predictions?view=leaderboard"
              className="rounded-sm text-[#B4541E] underline decoration-1 underline-offset-2 hover:text-orange"
            >
              See round-by-round prediction scores.
            </Link>
          </p>
        </div>
      </header>

      {/* ?dog= is read on the client so this page stays static; the fallback renders the same content */}
      <Suspense fallback={<LeaderboardView entries={entries} total={total} />}>
        <LeaderboardWithParams entries={entries} total={total} />
      </Suspense>

      <div className="mx-auto mt-12 flex max-w-[1260px] flex-col items-center justify-center gap-4 sm:flex-row">
        <CTAButton href="/bracket/matchups">Make your predictions</CTAButton>
        <CTAButton href="/predictions" variant="outline">
          View predictions
        </CTAButton>
      </div>
    </div>
  );
}
