"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { useRef } from "react";
import { DogAvatar } from "@/components/DogAvatar";
import type { Match, Tournament } from "@/lib/data";
import { getDog } from "@/lib/dogs";
import { cx } from "@/lib/format";
import { spring } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";

function Side({ id, winner }: { id: string | null; winner: string | null }) {
  if (!id) {
    return (
      <div className="flex items-center gap-3 opacity-60">
        <span className="grid size-12 place-items-center rounded-full border-2 border-dashed border-border text-ink-3">?</span>
        <span className="text-[14px] text-ink-3">To be decided</span>
      </div>
    );
  }
  const dog = getDog(id);
  const won = winner === id;
  const lost = winner !== null && !won;
  return (
    <div className={cx("flex min-w-0 items-center gap-3", lost && "opacity-55")}>
      <DogAvatar dogId={id} size={48} muted={lost} ring={won ? "gold" : undefined} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
          {dog.name}
          {won && <Check aria-label="winner" className="size-4 shrink-0 text-[#3C8A34]" />}
        </p>
        <p className="truncate text-[12px] text-ink-2">{dog.area}</p>
      </div>
    </div>
  );
}

function MatchCard({ m, n }: { m: Match; n: number }) {
  return (
    <li className="rounded-[18px] border border-border bg-surface p-4">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
        Match {n} {m.winner ? "· Result confirmed" : "· Up next"}
      </p>
      <div className="flex flex-col gap-3">
        <Side id={m.dogs[0]} winner={m.winner} />
        <Side id={m.dogs[1]} winner={m.winner} />
      </div>
    </li>
  );
}

/** Round progress + current round pairings from data/tournament.json. Not the bracket builder. */
export function ResultsModal({ open, onClose, tournament }: { open: boolean; onClose: () => void; tournament: Tournament }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onClose);
  const current = tournament.rounds.find((r) => r.confirmed < r.matchCount) ?? tournament.rounds.at(-1)!;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/55 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="results-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={spring}
            className="relative max-h-[88dvh] w-full max-w-[860px] overflow-y-auto rounded-[32px] bg-bg p-6 shadow-lift md:p-9"
          >
            <button
              type="button"
              onClick={onClose}
              data-autofocus
              aria-label="Close"
              className="absolute top-5 right-5 grid size-11 place-items-center rounded-full bg-bg-soft hover:bg-border"
            >
              <X aria-hidden className="size-5" />
            </button>
            <h2 id="results-title" className="display text-[36px] md:text-[48px]">
              Results &amp; next matchups
            </h2>
            <p className="mt-2 text-[16px] text-ink-2">
              <strong className="text-ink">{tournament.confirmedLabel}</strong> · {tournament.nextLabel}
            </p>

            <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {tournament.rounds.map((r) => (
                <li key={r.key} className="rounded-[14px] bg-surface p-3 text-center">
                  <p className="text-[12px] font-semibold text-ink-2">{r.short}</p>
                  <p className="text-[18px] font-bold tabular">
                    {r.confirmed}/{r.matchCount}
                  </p>
                  <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border">
                    <span className="block h-full rounded-full bg-orange" style={{ width: `${(r.confirmed / r.matchCount) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mt-8 mb-3 text-[20px] font-bold">{current.label}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {current.matches.map((m, i) => (
                <MatchCard key={m.id} m={m} n={i + 1} />
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
