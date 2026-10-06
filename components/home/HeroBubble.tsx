"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type MotionValue } from "motion/react";
import { forwardRef, useRef, type CSSProperties, type MouseEvent } from "react";
import { BubblePopover, type HeroDog } from "@/components/home/BubblePopover";
import { dogAlt, dogBlur } from "@/lib/dogs";
import { cx } from "@/lib/format";
import { spring } from "@/lib/motion";

/** Egg/blob outline: slightly narrower at the top, like a toe bean. */
const EGG_RADIUS = "50% 50% 47% 53% / 56% 56% 44% 44%";

export type BubbleLayout = {
  /** centre, % of stage width / height */
  x: number;
  y: number;
  /** diameter, % of stage width (cqw) */
  s: number;
  /** tilt toward the pad, degrees */
  tilt: number;
  /** label placement */
  label: "left" | "center" | "right";
  /** height / width */
  aspect: number;
};

type Props = {
  dog: HeroDog;
  index: number;
  layout: BubbleLayout;
  active: boolean;
  /** neighbour push (px) while another bubble is hovered */
  push: { x: number; y: number; dim: boolean };
  entered: boolean;
  playing: boolean;
  reduced: boolean;
  popSide: "left" | "right";
  showInlinePopover: boolean;
  parallax: { x: MotionValue<number>; y: MotionValue<number> };
  onActivate: (index: number, el: HTMLElement) => void;
  onDeactivate: (index: number) => void;
  onClick: (e: MouseEvent<HTMLAnchorElement>, index: number) => void;
};

export const HeroBubble = forwardRef<HTMLDivElement, Props>(function HeroBubble(
  {
    dog, index, layout, active, push, entered, playing, reduced, popSide, showInlinePopover,
    parallax, onActivate, onDeactivate, onClick,
  },
  shapeRef,
) {
  const isFirst = index === 0;
  // Focus caused by a tap/click must not count as activation, or the first tap would navigate.
  const pressed = useRef(false);
  // Deterministic "random" phase so server and client agree.
  const floatStyle: CSSProperties = reduced
    ? {}
    : { animation: `hero-float ${4 + ((index * 0.73) % 2)}s ease-in-out ${-index * 0.9}s infinite` };
  const bobStyle: CSSProperties =
    playing && !reduced ? { animation: `hero-bob 0.952s ease-in-out ${index * 0.08}s infinite` } : {};

  const href = `/leaderboard?dog=${dog.id}`;

  return (
    <li
      className={cx(
        "relative shrink-0 snap-center list-none md:pointer-events-none md:absolute md:inset-0",
        active ? "z-30" : "z-10",
      )}
      style={
        {
          "--x": layout.x,
          "--y": layout.y,
          "--s": layout.s,
        } as CSSProperties
      }
      data-hero-bubble
    >
      <motion.div
        className="md:pointer-events-auto md:absolute md:top-[calc(var(--y)*1%)] md:left-[calc(var(--x)*1%)]"
        style={{ x: parallax.x, y: parallax.y }}
      >
        <div className="relative md:-translate-x-1/2 md:-translate-y-1/2">
          <div style={floatStyle}>
            <div style={bobStyle}>
              {/* #N label — bounces once when its bubble activates */}
              <span
                aria-hidden
                key={active ? "on" : "off"}
                className={cx(
                  "display pointer-events-none absolute z-10 text-[22px] text-ink md:text-[max(18px,1.75cqw)]",
                  "-top-1 md:-top-[0.4em]",
                  layout.label === "left" && "left-1 md:left-[4%]",
                  layout.label === "center" && "left-1/2 -translate-x-1/2",
                  layout.label === "right" && "right-1 md:right-[2%]",
                  active && !reduced && "animate-[label-bounce_420ms_var(--ease-out)]",
                )}
              >
                #{dog.rank}
              </span>

              <motion.div
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{
                  scale: active ? 1.12 : 1,
                  opacity: push.dim ? 0.85 : 1,
                  x: push.x,
                  y: (active ? -8 : 0) + push.y,
                  rotate: active ? layout.tilt * 0.3 : layout.tilt,
                }}
                transition={entered ? spring : { ...spring, delay: (9 - index) * 0.06 }}
                className="relative"
              >
                <Link
                  href={href}
                  prefetch
                  onClick={(e) => onClick(e, index)}
                  onMouseEnter={(e) => onActivate(index, e.currentTarget)}
                  onMouseLeave={() => onDeactivate(index)}
                  onPointerDown={() => {
                    pressed.current = true;
                  }}
                  onFocus={(e) => {
                    if (pressed.current) pressed.current = false;
                    else onActivate(index, e.currentTarget);
                  }}
                  onBlur={() => onDeactivate(index)}
                  aria-label={`#${dog.rank} ${dog.name}, ${dog.area} — see on leaderboard`}
                  aria-describedby={active ? `bubble-pop-${dog.id}` : undefined}
                  className={cx(
                    "block rounded-[50%] transition-shadow duration-250",
                    "focus-visible:outline-offset-4",
                    active ? "shadow-[0_22px_40px_-14px_rgba(120,72,20,0.45)]" : "shadow-soft",
                  )}
                  style={{ borderRadius: EGG_RADIUS }}
                >
                  <div
                    ref={shapeRef}
                    data-vt-source={dog.id}
                    className={cx(
                      "relative overflow-hidden bg-bg-soft",
                      isFirst ? "w-[180px] md:w-[calc(var(--s)*1cqw)]" : "w-[136px] md:w-[calc(var(--s)*1cqw)]",
                      isFirst && "bg-yellow ring-[max(6px,0.5cqw)] ring-yellow",
                    )}
                    style={{ aspectRatio: `1 / ${layout.aspect}`, borderRadius: EGG_RADIUS }}
                  >
                    {/* counter-rotate so the dog stays upright inside the tilted egg */}
                    <motion.div
                      className="absolute inset-[-14%]"
                      animate={{ rotate: active ? -layout.tilt * 0.3 : -layout.tilt }}
                      transition={spring}
                    >
                      <Image
                        src={`/dogs/${dog.id}.jpg`}
                        alt={dogAlt(dog)}
                        fill
                        sizes={isFirst ? "(min-width: 768px) 18vw, 180px" : "(min-width: 768px) 13vw, 136px"}
                        priority={isFirst}
                        placeholder="blur"
                        blurDataURL={dogBlur(dog.id)}
                        className="object-cover"
                      />
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>
          <AnimatePresence>
            {active && showInlinePopover && <BubblePopover key={dog.id} dog={dog} side={popSide} />}
          </AnimatePresence>
        </div>
      </motion.div>
    </li>
  );
});
