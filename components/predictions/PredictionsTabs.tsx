"use client";

import { motion } from "motion/react";
import { BarChart3, List } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/format";
import { spring } from "@/lib/motion";

type View = "all" | "leaderboard";

const TABS: { id: View; label: string; short: string; icon: typeof List }[] = [
  { id: "all", label: "All predictions", short: "All predictions", icon: List },
  { id: "leaderboard", label: "Prediction leaderboard", short: "Leaderboard", icon: BarChart3 },
];

/** Two big segmented halves; the yellow fill slides between them and the URL follows (?view=leaderboard). */
export function PredictionsTabs({ initial, all, board }: { initial: View; all: ReactNode; board: ReactNode }) {
  const [view, setView] = useState<View>(initial);

  const select = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "leaderboard") url.searchParams.set("view", "leaderboard");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Predictions views"
        className="mt-6 grid grid-cols-2 gap-2 md:gap-4"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            const next = view === "all" ? "leaderboard" : "all";
            select(next);
            document.getElementById(`tab-${next}`)?.focus();
          }
        }}
      >
        {TABS.map(({ id, label, short, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(id)}
              className={cx(
                "relative flex h-14 items-center justify-center gap-2 rounded-full border px-3 text-[15px] font-semibold transition-colors md:h-[58px] md:gap-3 md:text-[19px]",
                active ? "border-transparent text-ink" : "border-border bg-surface text-ink hover:bg-bg-soft",
              )}
            >
              {active && (
                <motion.span layoutId="predictions-tab" transition={spring} className="absolute inset-0 rounded-full bg-yellow" />
              )}
              <Icon aria-hidden className="relative size-5 shrink-0 md:size-6" strokeWidth={id === "leaderboard" && active ? 2.6 : 2} />
              <span className="relative truncate sm:hidden">{short}</span>
              <span className="relative hidden truncate sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <div id="panel-all" role="tabpanel" aria-labelledby="tab-all" hidden={view !== "all"} className="mt-8">
        {all}
      </div>
      <div id="panel-leaderboard" role="tabpanel" aria-labelledby="tab-leaderboard" hidden={view !== "leaderboard"} className="mt-6">
        {view === "leaderboard" && board}
      </div>
    </>
  );
}
