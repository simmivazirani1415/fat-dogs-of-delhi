"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { ArrowRight, LayoutGrid, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChampionReveal, SubmitBracket } from "@/components/bracket/ChampionSubmit";
import { FullBracket } from "@/components/bracket/FullBracket";
import { MatchupStage, NextUp } from "@/components/bracket/MatchupStage";
import { BracketHero, HowItWorks, ProgressPill, RoadStepper } from "@/components/bracket/Sections";
import { useBracket } from "@/components/bracket/useBracket";
import { usePicker } from "@/components/bracket/usePicker";
import { useToast } from "@/components/providers/ToastProvider";
import { champion, matchups, ROUND_OFFSET, ROUND_SIZES, ROUNDS, TOTAL_PICKS } from "@/lib/bracket";
import { cx } from "@/lib/format";

export const MATCHUPS_HREF = "/bracket/matchups";

const HERO_CTA =
  "group/cta flex h-16 w-full max-w-[600px] items-center justify-center gap-3 rounded-full bg-yellow px-10 text-[20px] font-bold shadow-soft transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-yellow-hover hover:shadow-lift active:translate-y-0 md:h-[80px] md:text-[28px]";

export function BracketBuilder({ note }: { note: string | null }) {
  const toast = useToast();
  const { picks, loaded, pick, undo, reset, count, unlocked, open } = useBracket();
  const [featured, setFeatured] = useState<number | null>(null);
  const stageRef = useRef<HTMLElement>(null);

  const complete = count === TOTAL_PICKS;
  // featured matchup: an explicit choice (Next up / stepper / edit), else the next open one
  const current = featured ?? (complete ? null : open);

  useEffect(() => {
    if (loaded && featured !== null && featured >= TOTAL_PICKS) setFeatured(null);
  }, [loaded, featured]);

  const scrollToStage = useCallback(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    stageRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, []);

  const { picking, request: onPick, dialog } = usePicker({
    picks,
    pick,
    undo,
    onPicked: (_, after) => {
      setFeatured(null); // back to "next open"
      if (after.every(Boolean)) window.setTimeout(scrollToStage, 50);
    },
  });
  const pickingSide = picking && picking.index === current ? picking.side : null;

  // keyboard: ← left dog, → right dog, Backspace undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [role=dialog], [role=alertdialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft" && current !== null) {
        e.preventDefault();
        onPick(current, 0);
      } else if (e.key === "ArrowRight" && current !== null) {
        e.preventDefault();
        onPick(current, 1);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (undo()) {
          setFeatured(null);
          toast("Undid your last pick");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, onPick, undo, toast]);

  const nextUp = useMemo(
    () =>
      matchups(picks)
        .filter((m) => !picks[m.index] && m.dogs[0] && m.dogs[1] && m.index !== current)
        .slice(0, 3)
        .map((m) => m.index),
    [picks, current],
  );

  function jumpToRound(r: number) {
    const start = ROUND_OFFSET[r];
    let target = start;
    for (let i = start; i < start + ROUND_SIZES[r]; i++)
      if (!picks[i]) {
        target = i;
        break;
      }
    setFeatured(target);
    scrollToStage();
  }

  function editMatch(index: number) {
    setFeatured(index);
    scrollToStage();
  }

  const ctaLabel = count === 0 ? "Start picking" : complete ? "Review & submit" : "Open matchups";
  const stageRound = current !== null ? ROUNDS.findLastIndex((_, r) => current >= ROUND_OFFSET[r]) : ROUNDS.length - 1;
  const champ = champion(picks);

  return (
    <LayoutGroup>
      <BracketHero>
        <ProgressPill picks={picks} count={count} note={note} />
        <div className="mt-8 flex justify-center">
          {/* opens the matchups page; once everything is picked it jumps to review & submit */}
          {complete ? (
            <button type="button" onClick={scrollToStage} className={HERO_CTA}>
              {ctaLabel}
              <ArrowRight aria-hidden className="size-6 transition-transform duration-150 group-hover/cta:translate-x-1" strokeWidth={2.4} />
            </button>
          ) : (
            <Link href={MATCHUPS_HREF} className={HERO_CTA}>
              {ctaLabel}
              <ArrowRight aria-hidden className="size-6 transition-transform duration-150 group-hover/cta:translate-x-1" strokeWidth={2.4} />
            </Link>
          )}
        </div>
      </BracketHero>

      <HowItWorks />
      <RoadStepper picks={picks} unlocked={unlocked} onJump={jumpToRound} />

      <section ref={stageRef} id="matchups" aria-labelledby="stage-title" className="page-shell mt-16 scroll-mt-28 border-t border-border pt-12">
        {current !== null ? (
          <>
            <div className="text-center">
              <span className="inline-block rounded-full bg-yellow px-4 py-1.5 text-[14px] font-semibold">{ROUNDS[stageRound].label}</span>
              <h2 id="stage-title" className="display mt-3 text-[44px] md:text-[72px]">
                Matchups <span className="text-orange">begin here</span>
              </h2>
              <p className="mx-auto mt-2 max-w-[640px] text-[16px] text-ink-2">
                Pick a winner, and your chosen dog will move forward in your bracket.{" "}
                <span className="hidden md:inline">Use ← and → to pick, Backspace to undo.</span>
              </p>
            </div>
            <div className="mt-8">
              <AnimatePresence mode="popLayout" initial={false}>
                <MatchupStage key={current} picks={picks} index={current} pickingSide={pickingSide} onPick={onPick} />
              </AnimatePresence>
            </div>
            {complete && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setFeatured(null)}
                  className="h-12 rounded-full border border-ink/15 bg-surface px-6 font-semibold hover:bg-bg-soft"
                >
                  Back to review
                </button>
              </div>
            )}
            <NextUp picks={picks} items={nextUp} onFeature={(i) => setFeatured(i)} />
            <div className="mt-10 flex justify-center">
              <Link href={MATCHUPS_HREF} className={cx(HERO_CTA, "!h-16 max-w-[460px] !text-[20px]")}>
                <LayoutGrid aria-hidden className="size-6" strokeWidth={2} />
                View all matchups
                <ArrowRight aria-hidden className="size-6 transition-transform duration-150 group-hover/cta:translate-x-1" strokeWidth={2.4} />
              </Link>
            </div>
          </>
        ) : (
          champ && (
            <div>
              <h2 id="stage-title" className="sr-only">
                Your champion and full bracket
              </h2>
              <ChampionReveal key={champ} dogId={champ} />
              <div className="mt-10">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[24px] font-bold">Your full bracket</h3>
                    <p className="text-[14px] text-ink-2">Click any pick to change it.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setFeatured(null);
                      toast("Bracket cleared", { action: { label: "Undo", onClick: () => undo() }, duration: 5000 });
                    }}
                    className="flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-surface px-5 text-[15px] font-semibold hover:bg-bg-soft"
                  >
                    <RotateCcw aria-hidden className="size-4" /> Start over
                  </button>
                </div>
                <div className="rounded-[28px] border border-border bg-surface/60 p-4">
                  <FullBracket picks={picks} onEdit={editMatch} />
                </div>
              </div>
              <div className="mt-10">
                <SubmitBracket picks={picks} />
              </div>
            </div>
          )
        )}
      </section>

      {dialog}
    </LayoutGroup>
  );
}

/** /bracket?user=handle — same full bracket view, no pick buttons. */
export function BracketReadOnly({
  bracket,
  score,
}: {
  bracket: { handle: string; note: string; picks: string[]; champion: string };
  score: { correct: number; outOf: number; pctCorrect: number; points: number };
}) {
  return (
    <div className="page-shell pt-10 md:pt-12">
      <div className="text-center">
        <p className="text-[15px] font-semibold tracking-[0.14em] text-ink-2 uppercase">Prediction bracket</p>
        <h1 className="display mt-2 text-[44px] md:text-[80px]">
          @{bracket.handle}’s <span className="text-orange">bracket</span>
        </h1>
        <p className="mt-3 text-[16px] text-ink-2">
          <strong className="text-violet">
            {score.correct}/{score.outOf}
          </strong>{" "}
          correct · {score.pctCorrect}% · <strong className="text-violet">{Number.isInteger(score.points) ? score.points : score.points.toFixed(1)} points</strong>
        </p>
      </div>
      <ChampionReveal dogId={bracket.champion} />
      {bracket.note && <p className="mx-auto max-w-[620px] text-center text-[17px] text-ink">“{bracket.note}”</p>}
      <div className="mt-10 rounded-[28px] border border-border bg-surface/60 p-4">
        <FullBracket picks={bracket.picks} />
      </div>
      <div className="mt-10 flex justify-center">
        <a href="/bracket" className={cx("flex h-14 items-center gap-2 rounded-full bg-yellow px-8 text-[17px] font-semibold shadow-soft hover:bg-yellow-hover")}>
          Make your own bracket <ArrowRight aria-hidden className="size-5" />
        </a>
      </div>
    </div>
  );
}
