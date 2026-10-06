"use client";

import { BarChart3, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { PredictionCard } from "@/components/predictions/PredictionCard";
import { ResultsModal } from "@/components/predictions/ResultsModal";
import { SleepyDog, WaggingTail } from "@/components/predictions/SleepyDog";
import type { PredictionCard as Card } from "@/lib/predictions";
import { stripAt } from "@/lib/format";
import type { Tournament } from "@/lib/data";

type Props = {
  initial: Card[];
  initialNextOffset: number | null;
  notice: string;
  updatedLabel: string;
  tournament: Tournament;
  /** /predictions?user=handle — e.g. "View on Predictions" after submitting a bracket */
  initialQuery?: string;
};

export function AllPredictions({ initial, initialNextOffset, notice, updatedLabel, tournament, initialQuery = "" }: Props) {
  const [items, setItems] = useState(initial);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Card[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  async function loadMore() {
    if (nextOffset === null || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/predictions?offset=${nextOffset}`);
      if (!res.ok) throw new Error(String(res.status));
      const data: { items: Card[]; nextOffset: number | null } = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setNextOffset(data.nextOffset);
    } catch {
      setError("Couldn’t load more predictions. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuery) void runSearch(initialQuery);
    // only on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await runSearch(query);
  }

  async function runSearch(raw: string) {
    const q = stripAt(raw);
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/predictions?q=${encodeURIComponent(q)}`);
      const data: { items: Card[] } = await res.json();
      setResults(data.items);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const showing = results ?? items;

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:items-end">
        <form role="search" onSubmit={onSearch}>
          <label htmlFor="pred-search" className="mb-2 block text-[16px] font-medium text-ink">
            Search by Instagram or X username
          </label>
          <div className="flex gap-3">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink-2" />
              <input
                id="pred-search"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) setResults(null);
                }}
                placeholder="social username"
                autoComplete="off"
                spellCheck={false}
                className="h-14 w-full rounded-full border border-border bg-surface pr-5 pl-13 text-[17px] placeholder:text-ink-3 focus-visible:rounded-full"
              />
            </div>
            <button
              type="submit"
              className="h-14 shrink-0 rounded-full bg-ink px-8 text-[17px] font-semibold text-bg transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[#3a2418] active:translate-y-0"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </form>
        <div className="flex flex-col gap-2 pb-1 text-[14px] lg:pl-4">
          <p className="text-ink-3">{notice}</p>
          <button
            type="button"
            onClick={() => setResultsOpen(true)}
            aria-haspopup="dialog"
            className="flex w-fit items-center gap-2 rounded-md text-[16px] font-semibold text-ink underline underline-offset-4 hover:text-orange"
          >
            <BarChart3 aria-hidden className="size-5" /> Results &amp; next matchups
          </button>
        </div>
      </div>

      <div className="mt-10 mb-5">
        <h2 className="text-[26px] font-bold tracking-[-0.01em] md:text-[30px]">
          {results ? `Results for “@${stripAt(query)}”` : "Latest predictions"}
        </h2>
        {results ? (
          <button type="button" onClick={() => { setResults(null); setQuery(""); }} className="mt-1 text-[14px] font-medium text-orange underline underline-offset-2">
            Clear search
          </button>
        ) : (
          <p className="mt-1 text-[14px] text-ink-3">{updatedLabel}</p>
        )}
      </div>

      {showing.length ? (
        <div className="grid grid-cols-1 gap-5 *:min-w-0 md:grid-cols-2 lg:grid-cols-3">
          {showing.map((p, i) => (
            <PredictionCard key={p.id} p={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[24px] border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <SleepyDog className="w-48" />
          <p className="mt-4 text-[20px] font-bold">No one by that name yet.</p>
          <p className="mt-1 text-[15px] text-ink-2">Check the spelling, or make a prediction of your own.</p>
        </div>
      )}

      {!results && nextOffset !== null && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            aria-busy={loading}
            className="flex h-14 items-center gap-3 rounded-full border border-ink/15 bg-surface px-8 text-[17px] font-semibold transition-colors hover:bg-bg-soft disabled:opacity-80"
          >
            {loading && <WaggingTail className="h-5 w-8 text-orange" />}
            {loading ? "Loading…" : "Load more predictions"}
          </button>
          {error && (
            <p role="alert" className="text-[14px] text-[#B4541E]">
              {error}
            </p>
          )}
          <p className="text-[13px] text-ink-3">
            Showing {items.length.toLocaleString("en-IN")} predictions
          </p>
        </div>
      )}

      <ResultsModal open={resultsOpen} onClose={() => setResultsOpen(false)} tournament={tournament} />
    </div>
  );
}
