"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BubblePopover, type HeroDog } from "@/components/home/BubblePopover";
import { HeroBubble, type BubbleLayout } from "@/components/home/HeroBubble";
import { PawTrail } from "@/components/home/PawTrail";
import { useSound } from "@/components/providers/SoundProvider";
import { SoundToggle } from "@/components/SoundToggle";
import { UploadCTA } from "@/components/UploadCTA";
import { easeOut } from "@/lib/motion";
import { navigateWithMorph } from "@/lib/viewTransition";

/** Stage proportions of the hero design (1697 × 740). */
const STAGE_ASPECT = 1697 / 740;
/** Centre of the paw pad, % of stage. Bubbles tilt away from it like toes. */
const PAD = { x: 50.7, y: 80 };

/** Toe-bean positions in rank order, measured from the mockup: #1 biggest bottom-left, arcing to #10 bottom-right. */
const SPOTS: { x: number; y: number; s: number }[] = [
  { x: 17.4, y: 77.5, s: 17.7 },
  { x: 24.4, y: 46.5, s: 13.4 },
  { x: 31.9, y: 28.5, s: 11.7 },
  { x: 41.6, y: 15.5, s: 11.6 },
  { x: 53.7, y: 15.5, s: 11.1 },
  { x: 64.6, y: 26, s: 11.0 },
  { x: 72.8, y: 40.5, s: 10.7 },
  { x: 79.0, y: 57, s: 10.4 },
  { x: 84.4, y: 73.5, s: 10.0 },
  { x: 88.2, y: 89, s: 9.4 },
];

const LAYOUT: BubbleLayout[] = SPOTS.map((p, i) => {
  // real photos fill the whole egg (the mockup used cut-outs), so #2–#10 run ~6% smaller to keep the toes apart
  if (i > 0) p = { ...p, s: p.s * 0.94 };
  // radial angle from the pad centre (in height units), long axis of the egg points outward
  const angle = (Math.atan2(p.y - PAD.y, (p.x - PAD.x) * STAGE_ASPECT) * 180) / Math.PI;
  const tilt = Math.max(-40, Math.min(40, (angle + 90) * 0.45));
  return {
    ...p,
    tilt: i === 0 ? -8 : tilt,
    aspect: i === 0 ? 1.0 : 1.1,
    label: p.x < 48 ? "left" : p.x < 58 ? "center" : "right",
  };
});

function PadBlob() {
  return (
    <svg aria-hidden viewBox="0 0 770 490" className="size-full" preserveAspectRatio="none">
      <path
        fill="var(--bg-soft)"
        d="M385 4C298 4 250 64 192 150 124 252 30 326 14 398c-14 66 44 92 124 84 92-9 160-40 247-40s155 31 247 40c80 8 138-18 124-84-16-72-110-146-178-248C520 64 472 4 385 4Z"
      />
    </svg>
  );
}

export function PawHero({ dogs }: { dogs: HeroDog[] }) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const { playing } = useSound();
  const [active, setActive] = useState<number | null>(null);
  const [popSide, setPopSide] = useState<"left" | "right">("right");
  const [entered, setEntered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touch, setTouch] = useState(false);
  const shapeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 1400);
    const mq = window.matchMedia("(max-width: 767px)");
    const hoverNone = window.matchMedia("(hover: none)");
    const sync = () => {
      setIsMobile(mq.matches);
      setTouch(hoverNone.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    hoverNone.addEventListener("change", sync);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", sync);
      hoverNone.removeEventListener("change", sync);
    };
  }, []);

  // ---- cursor parallax (desktop, fine pointer, motion allowed)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 20 });
  const sy = useSpring(my, { stiffness: 120, damping: 20 });
  const padX = useTransform(sx, (v) => v * 8);
  const padY = useTransform(sy, (v) => v * 6);
  const bubX = useTransform(sx, (v) => v * 14);
  const bubY = useTransform(sy, (v) => v * 10);
  const parallaxOn = !reduced && !touch && !isMobile;

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!parallaxOn || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  // ---- hover / focus / tap
  const activate = useCallback((index: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    // flip the card to whichever side has room
    setPopSide(r.right + 290 > window.innerWidth - 16 ? "left" : "right");
    setActive(index);
  }, []);
  const deactivate = useCallback(
    (index: number) => {
      if (touch || isMobile) return; // touch: stays open until another bubble is tapped
      setActive((a) => (a === index ? null : a));
    },
    [touch, isMobile],
  );

  const onBubbleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, index: number) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      // first tap on touch shows the pop-up card; the second tap navigates
      if ((touch || isMobile) && active !== index) {
        activate(index, e.currentTarget);
        return;
      }
      const dog = dogs[index];
      navigateWithMorph(router, `/leaderboard?dog=${dog.id}`, shapeRefs.current[index], dog.id);
    },
    [touch, isMobile, active, activate, dogs, router],
  );

  // neighbours ease away from the active bubble and dim
  const pushes = useMemo(
    () =>
      LAYOUT.map((l, i) => {
        if (active === null || i === active || Math.abs(i - active) > 1 || isMobile) return { x: 0, y: 0, dim: false };
        const a = LAYOUT[active];
        const dx = (l.x - a.x) * STAGE_ASPECT;
        const dy = l.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        return { x: (dx / len) * 9, y: (dy / len) * 9, dim: true };
      }),
    [active, isMobile],
  );

  const delayAfterBubbles = reduced ? 0 : 0.62;

  return (
    <section
      aria-labelledby="hero-title"
      className="page-shell relative pt-6 md:pt-0"
      style={{ containerType: "inline-size" }}
    >
      {!isMobile && !touch && !reduced && <PawTrail />}
      <div
        ref={stageRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        // md+: fills the first viewport; bubble sizes follow width (cqw) so shapes never stretch
        className="relative flex flex-col gap-8 md:block md:h-[clamp(calc(100cqw/2.3),calc(100dvh-112px),calc(100cqw/1.6))]"
      >
        {/* paw pad */}
        <motion.div
          className="pointer-events-none absolute hidden md:block"
          style={{ left: "27.6%", bottom: "1%", width: "46.2cqw", height: "max(31cqw, 64%)", x: padX, y: padY }}
        >
          <PadBlob />
        </motion.div>

        {/* headline + CTA inside the pad */}
        <div className="relative z-[5] flex flex-col items-center text-center md:absolute md:bottom-[calc(1%+3.6cqw)] md:left-[50.7%] md:w-[52%] md:-translate-x-1/2">
          <h1 id="hero-title" className="display text-[clamp(40px,13vw,56px)] whitespace-nowrap md:text-[clamp(48px,6.3cqw,116px)]">
            {["64", "dogs."].map((w, i) => (
              <motion.span
                key={w}
                className="inline-block"
                initial={reduced ? false : { y: 24 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.45, ease: easeOut, delay: delayAfterBubbles + i * 0.06 }}
              >
                {w}
                {i === 0 && " "}
              </motion.span>
            ))}
            <br />
            {["One", "champion."].map((w, i) => (
              <motion.span
                key={w}
                className="inline-block text-orange"
                initial={reduced ? false : { y: 24 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.45, ease: easeOut, delay: delayAfterBubbles + 0.12 + i * 0.06 }}
              >
                {w}
                {i === 0 && " "}
              </motion.span>
            ))}
          </h1>
          <motion.div
            className="mt-6 md:mt-[2.2cqw]"
            initial={reduced ? false : { y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: easeOut, delay: delayAfterBubbles + 0.32 }}
          >
            <div className="flex items-center justify-center gap-3">
              <UploadCTA size="nav" className="md:hidden" />
              <UploadCTA className="max-md:hidden" />
              <SoundToggle className="md:hidden" />
            </div>
          </motion.div>
        </div>

        {/* toe beans — a snap-scroll row on mobile, the paw arc from md up */}
        <div className="-mx-[var(--gutter)] md:contents">
          <ol
            aria-label="Top 10 most-picked champions"
            className="flex snap-x snap-mandatory items-end gap-5 overflow-x-auto px-[var(--gutter)] pt-8 pb-8 [scrollbar-width:none] md:contents"
          >
            {dogs.map((dog, i) => (
              <HeroBubble
                key={dog.id}
                ref={(el) => {
                  shapeRefs.current[i] = el;
                }}
                dog={dog}
                index={i}
                layout={LAYOUT[i]}
                active={active === i}
                push={pushes[i]}
                entered={entered}
                playing={playing}
                reduced={reduced}
                popSide={popSide}
                showInlinePopover={!isMobile}
                parallax={{ x: bubX, y: bubY }}
                onActivate={activate}
                onDeactivate={deactivate}
                onClick={onBubbleClick}
              />
            ))}
          </ol>
        </div>

        {/* mobile: the tapped dog's card sits under the row */}
        {isMobile && (
          <div className="min-h-[150px]" aria-live="polite">
            <AnimatePresence mode="wait">
              {active !== null ? (
                <BubblePopover
                  key={dogs[active].id}
                  dog={dogs[active]}
                  side="right"
                  inline={false}
                  hint="Tap again to see on leaderboard"
                  className="mx-auto"
                />
              ) : (
                <p className="text-center text-[14px] text-ink-3">Tap a dog to meet them</p>
              )}
            </AnimatePresence>
          </div>
        )}

        <SoundToggle className="absolute right-0 bottom-[1%] z-20 max-md:hidden" />
      </div>
    </section>
  );
}
