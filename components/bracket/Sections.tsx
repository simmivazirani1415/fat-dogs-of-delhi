"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Check, ChevronDown, ChevronRight, ChevronsRight, Crown, Info, MousePointerClick, Trophy } from "lucide-react";
import { ROUND_OFFSET, ROUND_SIZES, ROUNDS, TOTAL_PICKS, type Picks } from "@/lib/bracket";
import { cx } from "@/lib/format";

// ---------------------------------------------------------------- hero
// The two hero dogs (public/brand/bracket-dog-*.png, made by scripts/extract-bracket-dogs.ts) are placed
// in the mockup's own coordinates (1024px-wide frame), scaled per breakpoint via --hero-s.

type Shape = { left: number; top: number; size: number; color: string; over?: boolean };
const SIDES = {
  left: {
    src: "/brand/bracket-dog-left.png",
    dog: { left: 0, top: 25, width: 236, height: 330 },
    shapes: [
      { left: -66, top: 18, size: 324, color: "#FDE9B8" }, // yellow blob behind the dog
      { left: -55, top: -10, size: 90, color: "#F6EBDF" },
      { left: 53, top: 293, size: 90, color: "#F7ECDF", over: true }, // small circle over the chest
    ] as Shape[],
  },
  right: {
    src: "/brand/bracket-dog-right.png",
    dog: { left: 66, top: 20, width: 234, height: 300 },
    shapes: [
      { left: 54, top: 8, size: 314, color: "#F3E8DD" }, // cream blob
      { left: 206, top: 275, size: 120, color: "#F7ECDF", over: true },
    ] as Shape[],
  },
} as const;

function HeroDog({ side }: { side: "left" | "right" }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, reduced ? 0 : side === "left" ? 50 : 80]);
  const s = SIDES[side];
  const circle = (sh: Shape, i: number) => (
    <span
      key={i}
      aria-hidden
      className="absolute rounded-full"
      style={{ left: sh.left, top: sh.top, width: sh.size, height: sh.size, background: sh.color }}
    />
  );
  return (
    // vertically centred in the hero and scaled up so the dogs span most of the first screen
    <div
      aria-hidden
      className={cx(
        "pointer-events-none absolute top-[46%] -translate-y-1/2 opacity-30 [--hero-s:0.7] nav:opacity-100 nav:[--hero-s:1.05] lg:[--hero-s:1.2] xl:[--hero-s:1.42] 2xl:[--hero-s:1.6]",
        side === "left" ? "left-0" : "right-0",
      )}
    >
    <motion.div style={{ y }}>
      <div
        className="relative h-[430px] w-[300px]"
        style={{ transform: "scale(var(--hero-s))", transformOrigin: side === "left" ? "left center" : "right center" }}
      >
        {s.shapes.filter((sh) => !sh.over).map(circle)}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.src}
          alt=""
          width={s.dog.width}
          height={s.dog.height}
          draggable={false}
          className="absolute max-w-none select-none"
          style={{
            ...s.dog,
            animation: reduced ? undefined : `hero-float ${side === "left" ? 5.2 : 6}s ease-in-out ${side === "left" ? 0 : -2}s infinite`,
          }}
        />
        {s.shapes.filter((sh) => sh.over).map(circle)}
      </div>
    </motion.div>
    </div>
  );
}

/** Hero fills exactly the first screen (title, progress, CTA, scroll cue); "How it works" comes after scrolling. */
export function BracketHero({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-x-clip nav:h-[max(620px,calc(100dvh-118px))]">
      <HeroDog side="left" />
      <HeroDog side="right" />
      <div className="page-shell relative z-10 flex h-full flex-col items-center justify-center pt-10 pb-16 text-center nav:pt-0 nav:pb-14">
        <h1 className="display text-[56px] md:text-[96px] xl:text-[124px]">
          Your <span className="text-orange">bracket</span>
        </h1>
        <p className="mt-4 text-[19px] font-medium md:text-[24px]">Your prediction journey from 64 dogs to one champion.</p>
        <p className="mt-3 max-w-[560px] text-[15px] text-ink-2 md:text-[18px]">
          Pick a winner in each matchup, and your chosen dogs will move forward through the rounds until one dog remains as the Fat
          Dog of Delhi champion.
        </p>
        <div className="mt-10 w-full">{children}</div>
      </div>
      <a
        href="#how-title"
        className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[13px] font-medium text-ink-3 hover:text-ink nav:flex"
      >
        How it works
        <ChevronDown aria-hidden className="size-5 motion-safe:animate-[paw-hop_1.6s_ease-in-out_infinite]" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------- progress pill

export function ProgressPill({ picks, count, note }: { picks: Picks; count: number; note: string | null }) {
  const reduced = useReducedMotion();
  const left = TOTAL_PICKS - count;
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex w-full max-w-[820px] items-center gap-4 rounded-full border border-border bg-surface py-2.5 pr-5 pl-5 shadow-soft sm:gap-5 sm:pl-6"
        role="status"
        aria-live="polite"
      >
        <p className="shrink-0 text-[15px] font-bold tabular sm:text-[16px]">
          {count} of {TOTAL_PICKS} picked
        </p>
        {/* 63 dots grouped by round (≥ 600 px); a thin bar below that */}
        <div aria-hidden className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-[6px] overflow-hidden sm:flex">
          {ROUND_SIZES.map((size, r) => (
            <span key={r} className="flex gap-[2px]">
              {Array.from({ length: size }, (_, i) => {
                const filled = !!picks[ROUND_OFFSET[r] + i];
                return (
                  <motion.span
                    key={i}
                    className={cx("size-[5px] rounded-full", filled ? "bg-yellow-hover" : "bg-[#E6DCD0]")}
                    animate={filled && !reduced ? { scale: [1, 1.7, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                );
              })}
            </span>
          ))}
        </div>
        <div aria-hidden className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E6DCD0] sm:hidden">
          <div className="h-full rounded-full bg-yellow-hover transition-[width] duration-300" style={{ width: `${(count / TOTAL_PICKS) * 100}%` }} />
        </div>
        <p className="shrink-0 text-right text-[12px] leading-tight text-ink-2 sm:text-[13px]">
          <span className="sr-only">
            You’ve made {count} pick{count === 1 ? "" : "s"}.{" "}
          </span>
          <strong className="font-semibold text-ink">
            {left} matchup{left === 1 ? "" : "s"} left
          </strong>
        </p>
      </div>
      {note && (
        <p className="flex max-w-[640px] items-start gap-2 rounded-[14px] border border-yellow/60 bg-yellow-soft/60 px-4 py-2.5 text-left text-[13px] leading-snug text-ink-2">
          <Info aria-hidden className="mt-px size-4 shrink-0 text-orange" />
          <span>
            <strong className="font-semibold text-ink">Joining late?</strong> {note.replace(/^Late entry:\s*/, "")}
          </span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- how it works

const STEPS = [
  { title: "Pick a winner", body: "Choose one dog in each matchup.", icon: MousePointerClick },
  { title: "Winners move forward", body: "Your winning picks keep moving to the next round.", icon: ChevronsRight },
  { title: "Build your champion", body: "Keep picking until one dog becomes your final champion.", icon: Trophy },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="page-shell scroll-mt-28 pt-20 md:pt-24">
      <h2 id="how-title" className="text-center text-[30px] font-bold tracking-[-0.01em] md:text-[40px]">
        How it works
      </h2>
      <p className="mt-1 text-center text-[16px] text-ink-2">It’s simple! Follow these 3 steps to complete your bracket.</p>
      <ol className="mt-10 flex flex-col items-stretch gap-3 nav:flex-row nav:items-center">
        {STEPS.map(({ title, body, icon: Icon }, i) => (
          <li key={title} className="contents">
            <div className="flex flex-1 items-center gap-5 rounded-[24px] border border-border bg-surface p-5 shadow-soft nav:min-h-[176px] nav:p-6">
              <span className="relative grid size-[88px] shrink-0 place-items-center rounded-full bg-yellow-soft nav:size-[112px]">
                <span aria-hidden className="absolute inset-2 rounded-full bg-yellow/40" />
                <Icon aria-hidden className="relative size-10 text-ink nav:size-12" strokeWidth={1.8} />
                <span className="absolute -top-1 -left-1 grid size-9 place-items-center rounded-full bg-yellow text-[17px] font-bold shadow-soft">
                  {i + 1}
                </span>
              </span>
              <span>
                <span className="block text-[19px] font-bold md:text-[21px]">{title}</span>
                <span className="mt-1 block text-[15px] text-ink-2">{body}</span>
              </span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight aria-hidden className="hidden size-6 shrink-0 text-ink nav:block" />}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- road stepper

export function RoadStepper({
  picks,
  unlocked,
  onJump,
}: {
  picks: Picks;
  unlocked: number;
  onJump: (round: number) => void;
}) {
  const progress = ROUND_SIZES.map((size, r) => {
    let n = 0;
    for (let i = ROUND_OFFSET[r]; i < ROUND_OFFSET[r] + size; i++) if (picks[i]) n++;
    return n / size;
  });
  const steps = [...ROUNDS.map((r, i) => ({ ...r, i })), { key: "champion", label: "Champion", short: "Champion", sub: "1 champion", i: 6 }];

  return (
    <section aria-labelledby="road-title" className="page-shell mt-12">
      <div className="rounded-[28px] bg-bg-soft/70 px-4 py-8 md:px-8">
        <h2 id="road-title" className="text-center text-[28px] font-bold tracking-[-0.01em] md:text-[34px]">
          The road to the champion
        </h2>
        <p className="mt-1 text-center text-[15px] text-ink-2">Your picks move through 6 rounds to one champion.</p>
        <ol className="mt-7 flex snap-x items-start gap-1 overflow-x-auto pb-2 [scrollbar-width:none] nav:justify-between nav:overflow-visible">
          {steps.map((s, idx) => {
            const isChampion = s.i === 6;
            const done = isChampion ? unlocked >= 6 : progress[s.i] === 1;
            const current = s.i === unlocked;
            const available = s.i <= unlocked;
            const fill = isChampion ? (done ? 1 : 0) : progress[s.i];
            return (
              <li key={s.key} className="flex shrink-0 snap-start items-start gap-1 nav:flex-1">
                <div className="relative flex min-w-[118px] flex-1 flex-col items-center gap-2">
                  {isChampion && <Crown aria-hidden className="absolute -top-6 size-7 text-[#E9A419]" fill="currentColor" />}
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => onJump(Math.min(s.i, 5))}
                    aria-current={current ? "step" : undefined}
                    className={cx(
                      "relative h-[52px] w-full overflow-hidden rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap transition-colors md:text-[16px]",
                      current ? "border-yellow bg-yellow-soft" : "border-border bg-surface",
                      !available && "cursor-not-allowed text-ink-3",
                      available && !current && "hover:bg-bg",
                    )}
                  >
                    {/* the chip fills like a progress bar as that round's picks complete */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-yellow transition-[width] duration-500 ease-out-soft"
                      style={{ width: `${fill * 100}%` }}
                    />
                    <span className="relative flex items-center justify-center gap-1.5">
                      {done && <Check aria-hidden className="size-4" strokeWidth={3} />}
                      {s.label}
                    </span>
                  </button>
                  <span className="text-[14px] text-ink-2">{s.sub}</span>
                </div>
                {idx < steps.length - 1 && <ChevronRight aria-hidden className="mt-3 size-5 shrink-0 text-ink" />}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
