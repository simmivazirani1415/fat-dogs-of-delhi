"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Trophy } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { CountUp } from "@/components/CountUp";
import { Paw } from "@/components/icons";
import { dogAlt, dogBlur, getDog } from "@/lib/dogs";
import { cx, fmt, pct } from "@/lib/format";
import type { LeaderEntry } from "@/components/leaderboard/types";

/** Tombstone arch: round top, soft bottom corners. */
const ARCH = "50% 50% 30px 30px / 34% 34% 30px 30px";

const MEDAL = {
  1: {
    card: "bg-[radial-gradient(120%_80%_at_50%_30%,#FEF3CF_0%,#FDE59A_55%,#FCD877_100%)] shadow-[0_24px_60px_-18px_rgba(250,204,78,0.75)]",
    disc: "bg-[#F9CC55] text-[#6B4A12]",
    inner: "border-yellow",
    pctColor: "text-brown-bar",
    order: "sm:order-2",
    height: "sm:h-[400px] md:h-[440px]",
    rise: 0.26,
  },
  2: {
    card: "bg-[linear-gradient(180deg,#EDE8E3_0%,#E2DAD2_100%)]",
    disc: "bg-[#D5CCC4] text-[#5E554E]",
    inner: "border-white",
    pctColor: "text-ink-2",
    order: "sm:order-1",
    height: "sm:h-[340px] md:h-[372px]",
    rise: 0.13,
  },
  3: {
    card: "bg-[linear-gradient(180deg,#F9E1D6_0%,#F3CDBD_100%)]",
    disc: "bg-[#E9A88E] text-[#6D2F1C]",
    inner: "border-white",
    pctColor: "text-[#9C4528]",
    order: "sm:order-3",
    height: "sm:h-[340px] md:h-[372px]",
    rise: 0,
  },
} as const;

const CONFETTI = [-70, -40, -12, 18, 46, 74];

function PodiumCard({
  entry,
  place,
  total,
  highlighted,
  onOpen,
}: {
  entry: LeaderEntry;
  place: 1 | 2 | 3;
  total: number;
  highlighted: boolean;
  onOpen: (id: string) => void;
}) {
  const m = MEDAL[place];
  const dog = getDog(entry.dogId);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const medalRight = place === 3;

  return (
    <motion.li
      value={entry.rank}
      data-dog-row={entry.dogId}
      className={cx("relative list-none", m.order)}
      initial={reduced ? false : { y: 90, opacity: 0.01 }}
      animate={{ y: 0, opacity: 1 }}
      transition={
        place === 1
          ? { type: "spring", stiffness: 240, damping: 15, delay: m.rise }
          : { type: "spring", stiffness: 300, damping: 24, delay: m.rise }
      }
    >
      <motion.button
        type="button"
        onClick={() => onOpen(entry.dogId)}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        whileHover={reduced ? undefined : { y: -6 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className={cx(
          "group/podium relative block h-[340px] w-full text-center",
          m.height,
          highlighted && "rounded-[30px]",
        )}
        style={{ borderRadius: ARCH } as CSSProperties}
        data-glow-target={entry.dogId}
      >
        <span className="sr-only">Rank {entry.rank}: </span>
        {/* arch */}
        <span aria-hidden className={cx("absolute inset-0", m.card)} style={{ borderRadius: ARCH }} />

        {/* photo breaking out of the top of the arch, softly masked so it blends */}
        <span
          aria-hidden
          className="absolute inset-x-[9%] -top-[5%] h-[64%] overflow-hidden"
          style={{
            maskImage: "radial-gradient(ellipse 50% 52% at 50% 50%, #000 62%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 50% 52% at 50% 50%, #000 62%, transparent 100%)",
          }}
        >
          <span data-dog-photo={entry.dogId} className="absolute inset-0 block">
            <Image
              src={dog.image}
              alt=""
              fill
              priority={place === 1}
              sizes="(min-width: 768px) 360px, 80vw"
              placeholder="blur"
              blurDataURL={dogBlur(dog.id)}
              className="object-cover transition-transform duration-250 ease-out-soft group-hover/podium:scale-105"
            />
          </span>
        </span>

        {/* medal disc */}
        <motion.span
          aria-hidden
          className={cx(
            "absolute top-[7%] z-10 grid size-[78px] place-items-center rounded-full shadow-soft md:size-[86px]",
            medalRight ? "right-[5%]" : "left-[5%]",
            m.disc,
          )}
          animate={hover && !reduced ? { rotate: [0, -6, 6, -4, 0] } : { rotate: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          style={{ transformOrigin: "50% 0%" }}
        >
          <span className="flex flex-col items-center leading-none">
            <Trophy className="size-7" strokeWidth={2.2} />
            <span className="mt-1 text-[22px] font-extrabold">#{entry.rank}</span>
          </span>
          {/* confetti paws puff out of the #1 medal on hover */}
          {place === 1 &&
            !reduced &&
            CONFETTI.map((angle, i) => (
              <motion.span
                key={angle}
                className="pointer-events-none absolute top-1/2 left-1/2 text-orange"
                initial={false}
                animate={
                  hover
                    ? {
                        x: [0, Math.sin((angle * Math.PI) / 180) * 70],
                        y: [0, -Math.cos((angle * Math.PI) / 180) * 70 + 10],
                        opacity: [0, 1, 0],
                        scale: [0.4, 1, 0.8],
                        rotate: [0, angle],
                      }
                    : { opacity: 0 }
                }
                transition={{ duration: 0.75, delay: i * 0.03, ease: "easeOut" }}
              >
                <Paw size={14} />
              </motion.span>
            ))}
        </motion.span>

        <span className="sr-only">Open details for {dogAlt(dog)}. </span>
        {/* inner white card */}
        <span
          className={cx(
            "absolute inset-x-3 bottom-3 z-10 flex flex-col items-center rounded-[26px] border-2 bg-surface/95 px-5 pt-4 pb-4 shadow-soft",
            m.inner,
          )}
        >
          <span className="text-[22px] leading-[1.15] font-bold text-balance text-ink md:text-[25px]">{dog.name}</span>
          <span className="mt-1 text-[15px] text-ink-2">{dog.area}</span>
          <span aria-hidden className="my-3 h-px w-[78%] bg-ink/15" />
          <span className="text-[15px] text-ink-2">
            <CountUp value={entry.picks} className="text-[24px] font-bold text-ink" /> of {fmt(total)} predictions
          </span>
          <span className={cx("mt-1 text-[18px] font-bold tabular", m.pctColor)}>
            <CountUp value={entry.pct} format={pct} />
          </span>
        </span>
      </motion.button>
    </motion.li>
  );
}

export function Podium({
  entries,
  total,
  highlightId,
  onOpen,
}: {
  entries: LeaderEntry[];
  total: number;
  highlightId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <ol
      aria-label="Top three most-picked champions"
      className="mx-auto grid max-w-[1180px] grid-cols-1 gap-12 pt-10 sm:grid-cols-3 sm:items-end sm:gap-3 md:gap-4 lg:-mt-10 lg:pt-0"
    >
      {entries.slice(0, 3).map((e, i) => (
        <PodiumCard
          key={e.dogId}
          entry={e}
          place={(i + 1) as 1 | 2 | 3}
          total={total}
          highlighted={highlightId === e.dogId}
          onOpen={onOpen}
        />
      ))}
    </ol>
  );
}
