"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useDogSheet } from "@/components/DogDetailSheet";
import { SocialGlyph } from "@/components/icons";
import { dogAlt, dogBlur, getDog } from "@/lib/dogs";
import type { PredictionCard as Card } from "@/lib/predictions";

const points = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} point${n === 1 ? "" : "s"}`;

export function PredictionCard({ p, index }: { p: Card; index: number }) {
  const { open } = useDogSheet();
  const reduced = useReducedMotion();
  const dog = getDog(p.champion);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const commentRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = commentRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [p.comment]);

  const rankLabel = p.rank ? `Rank #${p.rank}` : "Rank pending";
  const rankTitle = p.rank
    ? `Rank #${p.rank} on the prediction leaderboard`
    : "Rank will appear when the submission and results are confirmed";

  return (
    <motion.article
      aria-labelledby={`pred-${p.id}`}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.06 }}
      whileHover={reduced ? undefined : { y: -4 }}
      className="group/card flex flex-col rounded-[24px] border border-border bg-surface p-5 shadow-soft transition-shadow duration-250 hover:shadow-lift"
    >
      <header className="flex items-center justify-between gap-3">
        <a
          id={`pred-${p.id}`}
          href={p.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-2 rounded-md text-[17px] font-semibold text-ink hover:underline"
        >
          <span className="shrink-0">
            <SocialGlyph platform={p.platform} size={22} variant="color" />
          </span>
          <span className="truncate">@{p.handle}</span>
          <span className="sr-only">on {p.platform === "x" ? "X" : "Instagram"} (opens in a new tab)</span>
        </a>
        <span
          title={rankTitle}
          className="shrink-0 rounded-full bg-yellow px-3 py-1 text-[13px] font-medium text-ink"
        >
          {rankLabel}
        </span>
      </header>

      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => open(dog.id)}
          aria-label={`See ${dog.name} details`}
          className="relative size-[88px] shrink-0 overflow-hidden rounded-[16px] bg-bg-soft focus-visible:rounded-[16px]"
        >
          <Image
            src={dog.image}
            alt={dogAlt(dog)}
            fill
            sizes="88px"
            placeholder="blur"
            blurDataURL={dogBlur(dog.id)}
            className="dog-photo-fill object-cover transition-transform duration-250 ease-out-soft group-hover/card:rotate-3"
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Picked to win</p>
          <button
            type="button"
            onClick={() => open(dog.id)}
            className="-my-2 mt-0 min-h-11 rounded-md py-2 text-left text-[18px] leading-tight font-bold text-ink hover:underline"
          >
            {dog.name}
          </button>
        </div>
        <div className="flex shrink-0 flex-col items-center rounded-[14px] bg-violet-soft px-3.5 py-2.5 text-violet">
          <p className="leading-none tabular">
            <span className="text-[28px] font-bold">{p.correct}</span>
            <span className="text-[15px] font-medium">/{p.outOf}</span>
          </p>
          <p className="mt-1 text-[12px] font-medium">{p.pctCorrect}% correct</p>
        </div>
      </div>

      {p.comment && (
        <div className="mt-4">
          <p ref={commentRef} className={expanded ? "text-[15px] [overflow-wrap:anywhere] text-ink" : "line-clamp-3 text-[15px] [overflow-wrap:anywhere] text-ink"}>
            {p.comment}
          </p>
          {(clamped || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 rounded-md text-[13px] font-semibold text-orange hover:underline"
            >
              {expanded ? "less" : "more"}
            </button>
          )}
        </div>
      )}

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between border-t border-border pt-3 text-[13px]">
          <time dateTime={p.createdAt} className="text-ink-3">
            {p.createdLabel}
          </time>
          <Link
            href={`/bracket?user=${encodeURIComponent(p.handleKey)}`}
            className="rounded-md font-semibold text-ink underline underline-offset-2 hover:text-orange"
          >
            View bracket
          </Link>
        </div>
        <div className="mt-3">
          <p className="text-[17px] font-bold whitespace-nowrap text-violet tabular">{points(p.points)}</p>
          {p.lateEntryLines.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 text-[12px] text-ink-2">
              {p.lateEntryLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.article>
  );
}
