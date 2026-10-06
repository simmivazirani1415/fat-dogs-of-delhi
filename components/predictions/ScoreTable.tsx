"use client";

import { AnimatePresence, motion } from "motion/react";
import { Crown, Search } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { DogAvatar } from "@/components/DogAvatar";
import { SocialGlyph } from "@/components/icons";
import { useToast } from "@/components/providers/ToastProvider";
import type { CompactScoreRow } from "@/lib/predictions";
import { getDog } from "@/lib/dogs";
import { cx, stripAt } from "@/lib/format";

type Board = {
  rankedCount: number;
  howPointsWork: { text: string; cutoffs: string; updated: string };
  rows: CompactScoreRow[];
};

const ROW = 84;
const GAP = 8;
const VIRTUALISE_OVER = 300;

let cache: Board | null = null;

const fmtPoints = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function Row({ r, glowing }: { r: CompactScoreRow; glowing: boolean }) {
  const dog = getDog(r.champion);
  const first = r.rank === 1;
  return (
    <div
      data-score-row={r.handleKey}
      className={cx(
        "grid h-[84px] grid-cols-[44px_minmax(0,1fr)_64px] items-center gap-3 rounded-[18px] border px-3 sm:grid-cols-[110px_minmax(0,1fr)_120px_130px] sm:gap-4 sm:px-5",
        first ? "border-yellow bg-yellow-soft" : "border-border bg-surface",
        glowing && "is-glowing",
      )}
    >
      <div className="relative flex items-center gap-2 sm:gap-3">
        <span className="absolute -top-4 -left-1 sm:static sm:w-8">
          {first && <Crown aria-label="Top predictor" className="size-5 text-[#E9A419] motion-safe:animate-[hero-float_2.4s_ease-in-out_infinite] sm:size-8" fill="currentColor" />}
        </span>
        <span
          className={cx(
            "grid size-10 place-items-center rounded-full text-[17px] font-bold tabular sm:size-12 sm:text-[20px]",
            first ? "bg-yellow" : "bg-bg-soft",
          )}
        >
          {r.rank}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <span className="hidden sm:block">
          <DogAvatar dogId={dog.id} size={58} />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[16px] font-bold sm:text-[20px]">
            <span className="shrink-0">
              <SocialGlyph platform={r.platform} size={20} variant="color" />
            </span>
            <span className="truncate">@{r.handle}</span>
          </p>
          <p className="truncate text-[14px] text-ink-2 sm:text-[16px]">
            {dog.name}
            <span className="tabular sm:hidden"> · {r.correct}/{r.outOf}</span>
          </p>
        </div>
      </div>
      <div className="hidden text-center sm:block">
        <p className="text-[16px] font-bold tabular sm:text-[20px]">
          {r.correct}/{r.outOf}
        </p>
        <p className="text-[13px] text-ink-2 tabular sm:text-[15px]">{r.pctCorrect}%</p>
      </div>
      <div className="flex justify-center">
        <span className="grid h-11 min-w-[60px] place-items-center rounded-full bg-violet-soft px-3 text-[20px] font-bold text-violet tabular sm:h-[52px] sm:min-w-[110px] sm:text-[26px]">
          {fmtPoints(r.points)}
        </span>
      </div>
    </div>
  );
}

export function ScoreTable({ rankedCountHint }: { rankedCountHint: number }) {
  const toast = useToast();
  const [board, setBoard] = useState<Board | null>(cache);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [glow, setGlow] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (cache) return;
    fetch("/api/prediction-leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: Board) => {
        cache = b;
        setBoard(b);
      })
      .catch(() => setFailed(true));
  }, []);

  useLayoutEffect(() => {
    if (listRef.current) setOffset(listRef.current.getBoundingClientRect().top + window.scrollY);
  }, [board, open]);

  const rows = board?.rows ?? [];
  const virtual = rows.length > VIRTUALISE_OVER;
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ROW + GAP,
    overscan: 8,
    scrollMargin: offset,
  });

  function onFind(e: FormEvent) {
    e.preventDefault();
    const q = stripAt(query);
    if (!q || !rows.length) return;
    const index = Math.max(
      rows.findIndex((r) => r.handleKey === q),
      -1,
    );
    const i = index >= 0 ? index : rows.findIndex((r) => r.handleKey.includes(q));
    if (i < 0) {
      toast("Not ranked yet — rankings appear after results are confirmed.");
      return;
    }
    virtualizer.scrollToIndex(i, { align: "center" });
    setGlow(null);
    requestAnimationFrame(() => setGlow(rows[i].handleKey));
    setTimeout(() => setGlow(null), 2100);
  }

  return (
    <div className="rounded-[28px] border border-border bg-surface/60 p-4 shadow-soft sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <form role="search" onSubmit={onFind} className="w-full max-w-[700px]">
          <label htmlFor="rank-search" className="mb-2 block text-[17px] font-semibold">
            Find your rank
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink-2" />
            <input
              id="rank-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="@username"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="h-14 w-full rounded-[14px] border border-border bg-surface pr-5 pl-13 text-[17px] placeholder:text-ink-3"
            />
          </div>
        </form>
        <p className="w-fit shrink-0 rounded-full bg-violet-soft px-6 py-3 text-[18px] font-bold text-violet tabular">
          {(board?.rankedCount ?? rankedCountHint).toLocaleString("en-IN")} ranked
        </p>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="points-rules"
          className="flex items-center gap-2 rounded-md px-1 text-[17px] font-semibold text-ink-2 hover:text-ink"
        >
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} aria-hidden className="inline-block text-[13px]">
            ▶
          </motion.span>
          How points work
        </button>
        <AnimatePresence initial={false}>
          {open && board && (
            <motion.div
              id="points-rules"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 max-w-[780px] space-y-1.5 rounded-[16px] bg-bg-soft p-4 text-[15px] text-ink">
                <p>{board.howPointsWork.text}</p>
                <p className="text-ink-2">{board.howPointsWork.cutoffs}</p>
                <p className="text-ink-2">{board.howPointsWork.updated}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        aria-hidden
        className="mt-6 grid grid-cols-[44px_minmax(0,1fr)_64px] gap-3 px-3 text-[12px] font-semibold tracking-[0.1em] text-ink-2 uppercase sm:grid-cols-[110px_minmax(0,1fr)_120px_130px] sm:gap-4 sm:px-5 sm:text-[14px]"
      >
        <span className="sm:pl-9">Rank</span>
        <span>Predictor</span>
        <span className="hidden text-center sm:block">Correct</span>
        <span className="text-center">Points</span>
      </div>

      <div ref={listRef} className="mt-2" role="list" aria-label="Prediction leaderboard" aria-rowcount={rows.length}>
        {failed && <p className="py-10 text-center text-ink-2">Rankings could not load. Reload to try again.</p>}
        {!board && !failed &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="mb-2 h-[84px] animate-pulse rounded-[18px] bg-bg-soft" aria-hidden />
          ))}
        {board && rows.length === 0 && (
          <p className="py-10 text-center text-ink-2">Rankings appear once round results are confirmed.</p>
        )}
        {board && rows.length > 0 && virtual && (
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((v) => (
              <div
                key={v.key}
                role="listitem"
                className="absolute inset-x-0"
                style={{ top: 0, transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)`, height: ROW }}
              >
                <Row r={rows[v.index]} glowing={glow === rows[v.index].handleKey} />
              </div>
            ))}
          </div>
        )}
        {board && rows.length > 0 && !virtual && (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <div role="listitem" key={r.handleKey}>
                <Row r={r} glowing={glow === r.handleKey} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
