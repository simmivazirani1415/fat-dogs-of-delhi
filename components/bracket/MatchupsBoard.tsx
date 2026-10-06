"use client";

import Link from "next/link";
import { ArrowLeft, Check, Crown, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { ChampionReveal, SubmitBracket } from "@/components/bracket/ChampionSubmit";
import { MatchCard } from "@/components/bracket/MatchupStage";
import { ProgressPill } from "@/components/bracket/Sections";
import { useBracket } from "@/components/bracket/useBracket";
import { usePicker } from "@/components/bracket/usePicker";
import { champion, ROUND_OFFSET, ROUND_SIZES, ROUNDS, TOTAL_PICKS, unlockedRound } from "@/lib/bracket";
import { cx } from "@/lib/format";

/** /bracket/matchups — every matchup of a round as cards; rounds unlock as they're completed. */
export function MatchupsBoard({ note }: { note: string | null }) {
  const { picks, loaded, pick, undo, count, unlocked } = useBracket();
  const [round, setRound] = useState(0);

  // open on the round the user is up to
  useEffect(() => {
    if (loaded) setRound(Math.min(unlockedRound(picks), ROUNDS.length - 1));
    // only once storage has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const { picking, request, dialog } = usePicker({
    picks,
    pick,
    undo,
    onPicked: (index, after) => {
      // when this round is complete, move on to the next one
      const r = ROUNDS.findLastIndex((_, i) => index >= ROUND_OFFSET[i]);
      const done = after.slice(ROUND_OFFSET[r], ROUND_OFFSET[r] + ROUND_SIZES[r]).every(Boolean);
      if (done && r < ROUNDS.length - 1) {
        window.setTimeout(() => {
          setRound(r + 1);
          window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }, 350);
      }
    },
  });

  const roundPicked = (r: number) => picks.slice(ROUND_OFFSET[r], ROUND_OFFSET[r] + ROUND_SIZES[r]).filter(Boolean).length;
  const indexes = Array.from({ length: ROUND_SIZES[round] }, (_, i) => ROUND_OFFSET[round] + i);
  const complete = count === TOTAL_PICKS;
  const champ = champion(picks);

  return (
    <div className="page-shell pt-8 md:pt-10">
      <Link href="/bracket" className="inline-flex h-10 items-center gap-2 rounded-full px-1 text-[15px] font-medium text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> My bracket
      </Link>
      <header className="mt-2 text-center">
        <h1 className="display text-[48px] md:text-[80px]">
          All <span className="text-orange">matchups</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[620px] text-[16px] text-ink-2 md:text-[18px]">
          Pick a winner in every match. When a round is done, the next one unlocks with your winners.
        </p>
        <div className="mt-6">
          <ProgressPill picks={picks} count={count} note={note} />
        </div>
      </header>

      {/* round tabs (sticky under the navbar) */}
      <nav
        aria-label="Rounds"
        className="sticky top-[104px] z-30 -mx-[var(--gutter)] mt-8 bg-bg/90 px-[var(--gutter)] py-3 backdrop-blur-md"
      >
        <ol className="flex snap-x gap-2 overflow-x-auto [scrollbar-width:none] nav:justify-center">
          {ROUNDS.map((r, i) => {
            const available = i <= unlocked;
            const done = roundPicked(i) === ROUND_SIZES[i];
            const fill = roundPicked(i) / ROUND_SIZES[i];
            return (
              <li key={r.key} className="shrink-0 snap-start">
                <button
                  type="button"
                  disabled={!available}
                  aria-current={round === i ? "true" : undefined}
                  onClick={() => setRound(i)}
                  className={cx(
                    "relative h-12 overflow-hidden rounded-full border px-5 text-[15px] font-semibold whitespace-nowrap transition-colors",
                    round === i ? "border-ink bg-ink text-bg" : "border-border bg-surface hover:bg-bg-soft",
                    !available && "cursor-not-allowed text-ink-3",
                  )}
                >
                  {round !== i && (
                    <span aria-hidden className="absolute inset-y-0 left-0 bg-yellow/70 transition-[width] duration-500" style={{ width: `${fill * 100}%` }} />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {!available && <Lock aria-hidden className="size-3.5" />}
                    {done && <Check aria-hidden className="size-4" strokeWidth={3} />}
                    {r.label}
                    <span className={cx("text-[12px] font-medium tabular", round === i ? "text-bg/70" : "text-ink-3")}>
                      {roundPicked(i)}/{ROUND_SIZES[i]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          <li className="shrink-0">
            <span
              className={cx(
                "flex h-12 items-center gap-1.5 rounded-full border px-5 text-[15px] font-semibold whitespace-nowrap",
                complete ? "border-yellow bg-yellow" : "border-border bg-surface text-ink-3",
              )}
            >
              <Crown aria-hidden className="size-4 text-[#E9A419]" fill="currentColor" /> Champion
            </span>
          </li>
        </ol>
      </nav>

      <section aria-labelledby="round-title" className="mt-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="round-title" className="text-[26px] font-bold md:text-[32px]">
            {ROUNDS[round].label}
          </h2>
          <p className="text-[15px] text-ink-2 tabular">
            {roundPicked(round)} of {ROUND_SIZES[round]} picked in this round
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {indexes.map((i) => (
            <li key={i} id={`match-${i}`}>
              <MatchCard picks={picks} index={i} size="sm" pickingSide={picking?.index === i ? picking.side : null} onPick={request} />
            </li>
          ))}
        </ul>
      </section>

      {complete && champ && (
        <section aria-labelledby="champ-title" className="mt-16 border-t border-border pt-10">
          <h2 id="champ-title" className="sr-only">
            Your champion
          </h2>
          <ChampionReveal key={champ} dogId={champ} />
          <div className="mt-4 flex justify-center">
            <Link href="/bracket#matchups" className="text-[15px] font-semibold text-orange underline underline-offset-4">
              See your full bracket
            </Link>
          </div>
          <div className="mt-8">
            <SubmitBracket picks={picks} />
          </div>
        </section>
      )}
      {dialog}
    </div>
  );
}
