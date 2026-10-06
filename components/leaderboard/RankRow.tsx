"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, MapPin } from "lucide-react";
import { DogAvatar } from "@/components/DogAvatar";
import { StatusChip } from "@/components/StatusChip";
import type { LeaderEntry } from "@/components/leaderboard/types";
import { dogBlur, getDog, isAlive } from "@/lib/dogs";
import { cx, fmt, pct } from "@/lib/format";

export function RankRow({
  entry,
  topPct,
  index,
  onOpen,
}: {
  entry: LeaderEntry;
  /** #1's share — bars are scaled against it so small shares stay readable */
  topPct: number;
  index: number;
  onOpen: (id: string) => void;
}) {
  const dog = getDog(entry.dogId);
  const reduced = useReducedMotion();
  const out = !isAlive(dog);
  const width = Math.max(1.5, (entry.pct / topPct) * 100);

  return (
    <motion.li
      value={entry.rank}
      data-dog-row={entry.dogId}
      className="list-none border-b border-border last:border-0"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: (index % 20) * 0.03 }}
    >
      <button
        type="button"
        onClick={() => onOpen(entry.dogId)}
        data-glow-target={entry.dogId}
        className="group/row relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface focus-visible:rounded-[18px] sm:gap-5 sm:px-6 sm:py-3.5"
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-bg-soft text-[17px] font-semibold tabular sm:size-12 sm:text-[20px]"
        >
          <span className="sr-only">Rank </span>
          {entry.rank}
        </span>

        {/* avatar + hover preview */}
        <span className="relative shrink-0">
          <span data-dog-photo={entry.dogId} className="block transition-transform duration-250 ease-out-soft group-hover/row:scale-108">
            <span className="block sm:hidden">
              <DogAvatar dogId={dog.id} size={56} muted={out} />
            </span>
            <span className="hidden sm:block">
              <DogAvatar dogId={dog.id} size={76} muted={out} />
            </span>
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[calc(100%+12px)] z-20 hidden w-[200px] -translate-y-1/2 scale-95 rounded-[20px] border border-border bg-surface p-2 opacity-0 shadow-lift transition-[opacity,transform] duration-200 group-hover/row:scale-100 group-hover/row:opacity-100 md:block"
          >
            <Image
              src={dog.image}
              alt=""
              width={184}
              height={184}
              placeholder="blur"
              blurDataURL={dogBlur(dog.id)}
              className="aspect-square w-full rounded-full object-cover"
            />
            <span className="mt-2 block px-1 text-[14px] font-semibold">{dog.name}</span>
            <span className="flex items-center gap-1 px-1 pb-1 text-[12px] text-ink-2">
              <MapPin className="size-3" /> {dog.area}
            </span>
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[17px] leading-tight font-bold text-ink sm:text-[20px]">{dog.name}</span>
            <StatusChip dog={dog} />
          </span>
          <span className="mt-0.5 block truncate text-[14px] text-ink-2 sm:text-[16px]">{dog.area}</span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1.5 sm:w-[210px]">
          <span className="text-[14px] text-ink-2 sm:text-[16px]">
            <strong className="text-[17px] font-bold text-ink tabular sm:text-[20px]">{fmt(entry.picks)}</strong> picks
          </span>
          {/* bars hidden < 600px */}
          <span aria-hidden className="hidden h-2.5 w-full overflow-hidden rounded-full bg-[#EEE6DC] sm:block">
            <motion.span
              className="block h-full rounded-full bg-brown-bar"
              initial={reduced ? false : { width: 0 }}
              whileInView={{ width: `${width}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 + (index % 20) * 0.03 }}
              style={reduced ? { width: `${width}%` } : undefined}
            />
          </span>
          <span className="text-[13px] text-ink-2 tabular sm:text-[14px]">{pct(entry.pct)}</span>
        </span>
        <span className="sr-only">. Open details</span>
        <ChevronRight
          aria-hidden
          className="hidden size-5 shrink-0 text-ink-3 transition-transform duration-150 group-hover/row:translate-x-1 lg:block"
        />
      </button>
    </motion.li>
  );
}
