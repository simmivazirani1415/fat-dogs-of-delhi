"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useDogSheet } from "@/components/DogDetailSheet";
import { Podium } from "@/components/leaderboard/Podium";
import { RankRow } from "@/components/leaderboard/RankRow";
import type { LeaderEntry } from "@/components/leaderboard/types";
import { getDog } from "@/lib/dogs";
import { stripAt } from "@/lib/format";
import { dogTransitionName } from "@/lib/viewTransition";

const FIRST_ROWS = 20;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Props = { entries: LeaderEntry[]; total: number };

/** Reads ?dog= (client-only) so the page itself can stay static. */
export function LeaderboardWithParams(props: Props) {
  const dog = useSearchParams().get("dog");
  return <LeaderboardView {...props} deepLinkId={dog} />;
}

export function LeaderboardView({ entries, total, deepLinkId = null }: Props & { deepLinkId?: string | null }) {
  const { open } = useDogSheet();
  const [query, setQuery] = useState("");
  const deepIndex = deepLinkId ? entries.findIndex((e) => e.dogId === deepLinkId) : -1;
  const [showAll, setShowAll] = useState(deepIndex >= 3 + FIRST_ROWS);
  const [highlight, setHighlight] = useState<string | null>(null);

  const topPct = entries[0]?.pct || 1;
  const rest = entries.slice(3);
  const q = stripAt(query);
  const filtered = useMemo(
    () =>
      q
        ? entries.filter((e) => {
            const d = getDog(e.dogId);
            return d.name.toLowerCase().includes(q) || d.area.toLowerCase().includes(q);
          })
        : rest,
    [q, entries, rest],
  );
  const visible = q || showAll ? filtered : filtered.slice(0, FIRST_ROWS);

  // Deep link (?dog=id, e.g. from a Home bubble): jump to the dog, name its photo as the
  // view-transition target, then pulse a yellow glow twice.
  useIsoLayoutEffect(() => {
    if (!deepLinkId || deepIndex < 0) return;
    if (deepIndex >= 3 + FIRST_ROWS && !showAll) {
      setShowAll(true);
      return;
    }
    const row = document.querySelector<HTMLElement>(`[data-dog-row="${deepLinkId}"]`);
    const photo = document.querySelector<HTMLElement>(`[data-dog-photo="${deepLinkId}"]`);
    if (!row || !photo) return;

    const apply = () => {
      // instant, so the morph lands where the photo really is
      const rect = row.getBoundingClientRect();
      const target = window.scrollY + rect.top - Math.max(120, (window.innerHeight - rect.height) / 2);
      window.scrollTo({ top: Math.max(0, target), behavior: "instant" as ScrollBehavior });
      photo.style.viewTransitionName = dogTransitionName(deepLinkId);
      photo.dataset.vtDog = deepLinkId; // tells navigateWithMorph the destination is ready
    };
    // Now — a pending view transition pauses rendering, so a frame callback would never arrive in time —
    // and again one frame later, after the router's own scroll-to-top on ordinary link navigations.
    apply();
    const frame = requestAnimationFrame(apply);

    const glow = setTimeout(() => setHighlight(deepLinkId), 380);
    const clear = setTimeout(() => {
      photo.style.viewTransitionName = "";
      delete photo.dataset.vtDog;
    }, 1200);
    const unglow = setTimeout(() => setHighlight(null), 380 + 1900);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(glow);
      clearTimeout(clear);
      clearTimeout(unglow);
    };
  }, [deepLinkId, deepIndex, showAll]);

  // glow is applied straight to the target element so it works for podium cards and rows alike
  useEffect(() => {
    if (!highlight) return;
    const el = document.querySelector<HTMLElement>(`[data-glow-target="${highlight}"]`);
    el?.classList.add("is-glowing");
    return () => el?.classList.remove("is-glowing");
  }, [highlight]);

  return (
    <>
      <Podium entries={entries} total={total} highlightId={highlight} onOpen={open} />

      <section aria-labelledby="all-dogs" className="mx-auto mt-10 max-w-[1260px]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="all-dogs" className="text-[22px] font-bold">
            {q ? "Search results" : "Everyone else"}
          </h2>
          <label className="relative block w-full sm:w-[340px]">
            <span className="sr-only">Find a dog</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a dog"
              className="h-12 w-full rounded-[14px] border border-border bg-surface pr-4 pl-12 text-[16px] placeholder:text-ink-3 focus-visible:rounded-[14px]"
            />
          </label>
        </div>

        {visible.length ? (
          <motion.ol
            layout="size"
            aria-label={q ? "Matching dogs" : "Dogs ranked 4 to 64"}
            className="rounded-[24px] border border-border bg-surface/60 shadow-soft"
          >
            {visible.map((e, i) => (
              <RankRow key={e.dogId} entry={e} topPct={topPct} index={i} onOpen={open} />
            ))}
          </motion.ol>
        ) : (
          <p className="rounded-[24px] border border-dashed border-border bg-surface/60 px-6 py-10 text-center text-ink-2">
            No dog called “{query.trim()}” in this tournament.
          </p>
        )}

        <AnimatePresence>
          {!q && !showAll && rest.length > FIRST_ROWS && (
            <motion.div className="mt-5 flex justify-center" exit={{ opacity: 0, height: 0 }}>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex h-12 items-center gap-2 rounded-full border border-ink/15 bg-surface px-6 text-[16px] font-semibold transition-colors hover:bg-bg-soft"
              >
                Show all {entries.length} <ChevronDown aria-hidden className="size-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
