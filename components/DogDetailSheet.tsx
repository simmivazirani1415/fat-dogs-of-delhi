"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Swords, Trophy, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CTAButton } from "@/components/CTAButton";
import { DogAvatar } from "@/components/DogAvatar";
import { StatusChip } from "@/components/StatusChip";
import leaderboardJson from "@/data/leaderboard.json";
import areaCoords from "@/data/area-coords.json";
import { dogAlt, dogBlur, getDog } from "@/lib/dogs";
import { fmt, pct } from "@/lib/format";
import { spring } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";

const rows = new Map(leaderboardJson.rows.map((r) => [r.dogId, r]));
const coords = areaCoords as Record<string, { lat: number; lng: number } | null>;

const SheetContext = createContext<{ open: (dogId: string) => void } | null>(null);

export function useDogSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useDogSheet must be used inside <DogSheetProvider>");
  return ctx;
}

/** Shared Dog detail sheet (Leaderboard, Predictions, Map): right drawer on desktop, bottom sheet on mobile. */
export function DogSheetProvider({ children }: { children: ReactNode }) {
  const [dogId, setDogId] = useState<string | null>(null);
  const open = useCallback((id: string) => setDogId(id), []);
  const close = useCallback(() => setDogId(null), []);
  return (
    <SheetContext.Provider value={{ open }}>
      {children}
      <AnimatePresence>{dogId && <DogDetailSheet key={dogId} dogId={dogId} onClose={close} />}</AnimatePresence>
    </SheetContext.Provider>
  );
}

function DogDetailSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose);
  // client-only component (opened after interaction), so window is available on first render
  const [mobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);

  const dog = getDog(dogId);
  const row = rows.get(dogId);
  const opponent = getDog(dog.opponentId);
  const onMap = Boolean(coords[dog.area]);
  const titleId = `dog-sheet-${dogId}`;

  return (
    <div className="fixed inset-0 z-[70]">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={mobile ? { y: "100%" } : { x: "100%" }}
        animate={mobile ? { y: 0 } : { x: 0 }}
        exit={mobile ? { y: "100%" } : { x: "100%" }}
        transition={spring}
        className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-[32px] bg-surface p-6 shadow-lift md:inset-y-3 md:right-3 md:left-auto md:max-h-none md:w-[440px] md:rounded-[32px] md:p-8"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <span className="mx-auto h-1.5 w-12 rounded-full bg-border md:hidden" aria-hidden />
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            aria-label="Close"
            className="absolute top-5 right-5 grid size-11 place-items-center rounded-full bg-bg-soft text-ink transition-colors hover:bg-border"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="relative aspect-square w-full rounded-[24px] bg-yellow-soft">
          <Image
            src={dog.image}
            alt={dogAlt(dog)}
            fill
            sizes="(min-width: 768px) 380px, 100vw"
            placeholder="blur"
            blurDataURL={dogBlur(dog.id)}
            className="rounded-full object-cover p-[7%]"
          />
          {row && (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-[15px] font-bold shadow-soft">
              <Trophy aria-hidden className="size-4 text-orange" /> #{row.rank}
            </span>
          )}
        </div>

        <h2 id={titleId} className="display mt-5 text-[34px] md:text-[40px]">
          {dog.name}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-[16px] text-ink-2">
          <MapPin aria-hidden className="size-4" /> {dog.area}
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-[18px] bg-bg-soft px-2 py-3">
            <dt className="text-[12px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Rank</dt>
            <dd className="mt-1 text-[22px] font-bold tabular">#{row?.rank ?? "—"}</dd>
          </div>
          <div className="rounded-[18px] bg-bg-soft px-2 py-3">
            <dt className="text-[12px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Picks</dt>
            <dd className="mt-1 text-[22px] font-bold tabular">{row ? fmt(row.picks) : "—"}</dd>
          </div>
          <div className="rounded-[18px] bg-yellow-soft px-2 py-3">
            <dt className="text-[12px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Share</dt>
            <dd className="mt-1 text-[22px] font-bold tabular">{row ? pct(row.pct) : "—"}</dd>
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-[18px] border border-border p-4">
          <span className="text-[14px] text-ink-2">Bracket status</span>
          <StatusChip dog={dog} className="text-[13px]" />
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-border p-4">
          <DogAvatar dogId={opponent.id} size={52} muted={false} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
              <Swords aria-hidden className="size-3.5" /> Round-of-64 opponent · Match {String(dog.roundOf64Match).padStart(2, "0")}
            </p>
            <p className="truncate text-[16px] font-semibold">{opponent.name}</p>
            <p className="truncate text-[13px] text-ink-2">{opponent.area}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <CTAButton href="/bracket/matchups" className="w-full">
            Pick them in your bracket
          </CTAButton>
          {onMap && (
            <Link
              href={`/dogs/map?dog=${dog.id}`}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-ink/15 text-[16px] font-semibold transition-colors hover:bg-bg-soft"
            >
              <MapPin aria-hidden className="size-4" /> See on map
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
