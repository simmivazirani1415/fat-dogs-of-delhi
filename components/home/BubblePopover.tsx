"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, MapPin } from "lucide-react";
import { dogAlt, dogBlur } from "@/lib/dogs";
import { cx, fmt, pct } from "@/lib/format";

export type HeroDog = { id: string; name: string; area: string; rank: number; picks: number; pct: number };

/** Pop-up card for a hovered / focused / tapped hero bubble. */
export function BubblePopover({
  dog,
  side,
  inline = true,
  hint = "Tap to see on leaderboard",
  className,
}: {
  dog: HeroDog;
  side: "left" | "right";
  /** inline = positioned beside the bubble; false = static (mobile slot under the row) */
  inline?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <motion.div
      role="tooltip"
      id={`bubble-pop-${dog.id}`}
      initial={{ opacity: 0, scale: 0.9, x: inline ? (side === "right" ? -8 : 8) : 0 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 420, damping: 28, duration: 0.18 }}
      style={{ transformOrigin: side === "right" ? "left center" : "right center" }}
      className={cx(
        "pointer-events-none z-30 w-[270px] rounded-[20px] border border-border bg-surface p-3 shadow-lift",
        inline && "absolute top-1/2 -translate-y-1/2",
        inline && (side === "right" ? "left-[calc(100%+14px)]" : "right-[calc(100%+14px)]"),
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Image
          src={`/dogs/${dog.id}.jpg`}
          alt={dogAlt(dog)}
          width={64}
          height={64}
          placeholder="blur"
          blurDataURL={dogBlur(dog.id)}
          className="size-16 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tracking-[0.1em] text-ink-3 uppercase">#{dog.rank} most picked</p>
          <p className="text-[17px] leading-tight font-bold text-ink">{dog.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-2">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{dog.area}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 rounded-[12px] bg-yellow-soft px-3 py-2 text-[14px] text-ink tabular">
        <strong className="font-bold">{fmt(dog.picks)}</strong> picks · {pct(dog.pct)} of predictions
      </p>
      <p className="mt-2 flex items-center gap-1 px-1 text-[13px] font-medium text-orange">
        {hint} <ArrowRight aria-hidden className="size-3.5" />
      </p>
    </motion.div>
  );
}
