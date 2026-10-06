"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronRight, MapPin, X } from "lucide-react";
import { useState } from "react";
import { matchupDogs, realResult, ROUND_OFFSET, roundOf, ROUNDS, type Picks } from "@/lib/bracket";
import { dogAlt, dogBlur, getDog } from "@/lib/dogs";
import { cx } from "@/lib/format";

const BLOB = "54% 46% 50% 50% / 52% 52% 48% 48%";
const matchNo = (index: number) => index - ROUND_OFFSET[roundOf(index)] + 1;

type SideState = "idle" | "picked" | "lost";

/**
 * One dog in a matchup. Both sides look the same until the user acts: the yellow wash appears on
 * hover, and stays only on the dog they picked (saved pick, or the one being picked right now).
 */
function DogSide({
  id,
  index,
  side,
  state,
  isPick,
  dimmed,
  showArea,
  size,
  onHover,
  onPick,
}: {
  id: string;
  index: number;
  side: 0 | 1;
  state: SideState;
  isPick: boolean;
  dimmed: boolean;
  /** both dogs share a name (e.g. Max vs Max): name the area on the button */
  showArea: boolean;
  size: "lg" | "sm";
  onHover: (side: 0 | 1 | null) => void;
  onPick: () => void;
}) {
  const reduced = useReducedMotion();
  const dog = getDog(id);
  const chosen = state === "picked" || (state === "idle" && isPick);
  const lg = size === "lg";
  return (
    <div
      className="group/side flex min-w-0 flex-1 flex-col items-center"
      onMouseEnter={() => onHover(side)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.div
        animate={state === "lost" ? { opacity: 0.4, scale: 0.94 } : { opacity: dimmed ? 0.82 : 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className={cx("relative w-full", lg ? "max-w-[400px]" : "max-w-[220px]")}
      >
        <motion.div
          layoutId={reduced || !lg ? undefined : `m-${index}-${side}`}
          className={cx(
            "relative mx-auto aspect-square w-[84%] transition-transform duration-250 ease-out-soft group-hover/side:scale-105",
            side === 0 ? "group-hover/side:rotate-2" : "group-hover/side:-rotate-2",
          )}
        >
          <span
            aria-hidden
            className={cx(
              "absolute -inset-[11%] transition-colors duration-250",
              chosen ? "bg-yellow/60" : "bg-bg-soft group-hover/side:bg-yellow/35",
            )}
            style={{ borderRadius: BLOB }}
          />
          <span
            className={cx(
              "absolute inset-0 overflow-hidden rounded-full",
              chosen && "ring-[5px] ring-yellow",
              state === "picked" && "motion-safe:animate-[glow-pulse_900ms_var(--ease-out)_1]",
            )}
          >
            <Image
              src={dog.image}
              alt={dogAlt(dog)}
              fill
              sizes={lg ? "(min-width: 900px) 280px, 60vw" : "180px"}
              placeholder="blur"
              blurDataURL={dogBlur(dog.id)}
              className="object-cover [scale:1.08]"
            />
          </span>
          <AnimatePresence>
            {chosen && (
              <motion.span
                aria-hidden
                initial={reduced ? { opacity: 0 } : { scale: 2.2, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className={cx(
                  "absolute top-[4%] right-[0%] grid place-items-center rounded-full border-orange bg-surface/95 text-center leading-tight font-extrabold text-orange uppercase shadow-lift",
                  lg ? "size-[30%] border-4 text-[13px] md:text-[15px]" : "size-[38%] border-[3px] text-[10px]",
                )}
              >
                <span>
                  <Check className={cx("mx-auto", lg ? "size-6" : "size-4")} strokeWidth={3} />
                  Picked
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
        <div
          className={cx(
            "relative z-10 mx-auto w-[84%] rounded-[20px] border border-border bg-surface text-center shadow-soft transition-transform duration-250 group-hover/side:-translate-y-1",
            lg ? "-mt-10 px-4 py-3" : "-mt-6 px-2 py-2",
          )}
        >
          <p className={cx("leading-tight font-bold", lg ? "text-[20px] md:text-[24px]" : "text-[15px]")}>{dog.name}</p>
          <p className={cx("mt-0.5 flex items-center justify-center gap-1 text-ink-2", lg ? "text-[14px]" : "text-[12px]")}>
            <MapPin aria-hidden className={lg ? "size-3.5" : "size-3"} />
            <span className="truncate">{dog.area}</span>
          </p>
        </div>
      </motion.div>
      <button
        type="button"
        onClick={onPick}
        disabled={state !== "idle"}
        aria-pressed={isPick}
        aria-keyshortcuts={lg ? (side === 0 ? "ArrowLeft" : "ArrowRight") : undefined}
        className={cx(
          "w-full rounded-full border font-semibold transition-[background-color,border-color,transform] duration-150 group-hover/side:-translate-y-0.5 disabled:pointer-events-none",
          lg ? "mt-5 h-14 max-w-[340px] text-[18px]" : "mt-3 h-11 max-w-[200px] text-[14px]",
          chosen ? "border-yellow bg-yellow" : "border-border bg-surface group-hover/side:border-yellow group-hover/side:bg-yellow-hover",
        )}
      >
        {isPick && state === "idle" ? (
          <span className="flex items-center justify-center gap-1.5">
            <Check aria-hidden className="size-4" strokeWidth={3} /> Your pick
          </span>
        ) : (
          <>
            Pick {dog.name}
            {showArea && <span className="font-normal text-ink-2"> · {dog.area}</span>}
          </>
        )}
      </button>
    </div>
  );
}

/** A matchup card: two dogs, VS disc, pick buttons. `lg` = featured stage, `sm` = matchups grid. */
export function MatchCard({
  picks,
  index,
  pickingSide,
  onPick,
  size = "lg",
}: {
  picks: Picks;
  index: number;
  pickingSide: 0 | 1 | null;
  onPick: (index: number, side: 0 | 1) => void;
  size?: "lg" | "sm";
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<0 | 1 | null>(null);
  const [a, b] = matchupDogs(picks, index);
  const round = roundOf(index);
  const current = picks[index];
  const result = current ? realResult(picks, index) : null;
  const lg = size === "lg";
  const stateOf = (s: 0 | 1): SideState => (pickingSide === null ? "idle" : pickingSide === s ? "picked" : "lost");

  if (!a || !b) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-[28px] border border-dashed border-border bg-surface/40 p-6 text-center text-[14px] text-ink-3">
        Match {matchNo(index)} · waiting for earlier picks
      </div>
    );
  }
  const sameName = getDog(a).name === getDog(b).name;

  return (
    <div
      role="group"
      aria-label={`${ROUNDS[round].label}, match ${matchNo(index)}: ${getDog(a).name} versus ${getDog(b).name}`}
      className={cx("relative", lg ? "mx-auto max-w-[1000px] rounded-[40px] bg-surface/50 px-4 pt-6 pb-8 sm:px-8" : "rounded-[28px] border border-border bg-surface/70 px-3 pt-4 pb-5 shadow-soft")}
    >
      <p className={cx("text-center font-semibold tracking-[0.14em] text-ink-2 uppercase", lg ? "mb-5 text-[13px]" : "mb-3 text-[11px]")}>
        Match {matchNo(index)}
        {lg && ` · ${ROUNDS[round].label}`}
      </p>
      <div className={cx("relative flex items-start", lg ? "flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-4" : "gap-2")}>
        <DogSide id={a} index={index} side={0} state={stateOf(0)} isPick={current === a} dimmed={hover === 1} showArea={sameName} size={size} onHover={setHover} onPick={() => onPick(index, 0)} />
        <motion.span
          key={`vs-${index}-${lg}`}
          aria-hidden
          initial={reduced ? false : { rotate: 0 }}
          animate={reduced ? undefined : { rotate: [0, -14, 12, -6, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={cx(
            "display z-20 grid shrink-0 place-items-center rounded-full bg-surface text-orange shadow-lift",
            lg
              ? "size-20 text-[34px] sm:absolute sm:top-[34%] sm:left-1/2 sm:size-24 sm:-translate-x-1/2 sm:text-[42px]"
              : "absolute top-[30%] left-1/2 size-12 -translate-x-1/2 text-[20px]",
          )}
        >
          VS
        </motion.span>
        <DogSide id={b} index={index} side={1} state={stateOf(1)} isPick={current === b} dimmed={hover === 0} showArea={sameName} size={size} onHover={setHover} onPick={() => onPick(index, 1)} />
      </div>
      {result && (
        <p
          className={cx(
            "mx-auto flex w-fit items-center gap-1.5 rounded-full px-3 py-1 font-semibold",
            lg ? "mt-5 text-[14px]" : "mt-3 text-[12px]",
            result === current ? "bg-[#E3F4E1] text-[#2F6B2A]" : "bg-bg-soft text-ink-2",
          )}
        >
          {result === current ? <Check aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
          Result: {getDog(result).name} won
        </p>
      )}
    </div>
  );
}

/** Featured matchup on the bracket page: slides in from the right, out to the left. */
export function MatchupStage(props: { picks: Picks; index: number; pickingSide: 0 | 1 | null; onPick: (index: number, side: 0 | 1) => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={props.index}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: -120 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <MatchCard {...props} size="lg" />
    </motion.div>
  );
}

export function NextUp({ picks, items, onFeature }: { picks: Picks; items: number[]; onFeature: (index: number) => void }) {
  const reduced = useReducedMotion();
  if (!items.length) return null;
  return (
    <section aria-label="Next up" className="mx-auto mt-8 max-w-[1100px] rounded-[28px] border border-border bg-surface px-4 py-4 shadow-soft sm:px-6">
      <div className="flex items-center gap-4">
        <h3 className="hidden shrink-0 text-[18px] font-bold sm:block">Next up</h3>
        <ul className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] sm:justify-around sm:gap-2">
          <li className="shrink-0 self-center text-[15px] font-bold sm:hidden">Next up</li>
          {items.map((i) => {
            const [a, b] = matchupDogs(picks, i) as [string, string];
            const da = getDog(a);
            const db = getDog(b);
            return (
              <li key={i} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => onFeature(i)}
                  className="group/next relative flex items-center gap-2 rounded-[18px] px-2 py-1.5 transition-colors hover:bg-bg-soft"
                >
                  <span className="flex flex-col items-center">
                    <span className="flex items-center gap-1.5">
                      {[a, b].map((id, s) => (
                        <span key={id} className="contents">
                          {s === 1 && <span aria-hidden className="display text-[16px] text-[var(--orange-text)]">VS</span>}
                          <motion.span layoutId={reduced ? undefined : `m-${i}-${s}`} className="relative block size-14 overflow-hidden rounded-full bg-bg-soft">
                            <Image src={getDog(id).image} alt="" fill sizes="56px" className="object-cover [scale:1.08]" />
                          </motion.span>
                        </span>
                      ))}
                    </span>
                    <span className="mt-1 text-[13px] font-semibold">Match {matchNo(i)}</span>
                    <span className="max-w-[170px] truncate text-[12px] text-ink-2">
                      {da.name} · {db.name}
                    </span>
                  </span>
                  <span className="sr-only">. Open this matchup</span>
                  <ChevronRight aria-hidden className="size-5 text-ink transition-transform duration-150 group-hover/next:translate-x-1" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
