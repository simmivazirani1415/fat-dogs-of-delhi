"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { LocateFixed, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CountUp } from "@/components/CountUp";
import { DogListCard } from "@/components/map/DogListCard";
import { DogMap, type FocusRequest, type MapView } from "@/components/map/DogMap";
import { useToast } from "@/components/providers/ToastProvider";
import { UploadCTA } from "@/components/UploadCTA";
import type { MapDog } from "@/lib/mapDogs";
import { cx } from "@/lib/format";

type Chip = "india" | "delhi" | "near";
type StatusResult = { id: string; name: string; area: string; status: "pending" | "approved" | "rejected"; createdAt: string };

const STATUS_STYLE = {
  pending: "bg-yellow-soft text-ink",
  approved: "bg-[#E3F4E1] text-[#2F6B2A]",
  rejected: "bg-[#FBE3D8] text-[#8A2E14]",
} as const;

export function DogMapView({ items, total }: { items: MapDog[]; total: number }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("india");
  const [view, setView] = useState<MapView>({ mode: "india", seq: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [locating, setLocating] = useState(false);

  // stable list numbers: tournament dogs keep their leaderboard rank (ties included), uploads follow
  const numbered = useMemo(() => {
    let n = items.filter((d) => d.kind === "tournament").length;
    return items.map((d) => ({ dog: d, number: d.rank ?? ++n }));
  }, [items]);

  const q = query.trim().toLowerCase().replace(/^@/, "");
  const filtered = useMemo(
    () =>
      q
        ? numbered.filter(
            ({ dog }) =>
              dog.name.toLowerCase().includes(q) || dog.place.toLowerCase().includes(q) || dog.handle?.toLowerCase().includes(q),
          )
        : numbered,
    [numbered, q],
  );
  const mapDogs = useMemo(() => filtered.map((f) => f.dog), [filtered]);

  // ---- virtualised side list
  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 104,
    overscan: 6,
  });

  function select(id: string | null, fromList: boolean) {
    setActiveId(id);
    if (!id) return;
    setFocus({ id, fly: fromList, seq: Date.now() });
    if (!fromList) {
      const i = filtered.findIndex((f) => f.dog.id === id);
      if (i >= 0) virtualizer.scrollToIndex(i, { align: "center" });
    }
  }

  // deep link from the Dog detail sheet: /dogs/map?dog=d17a
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("dog");
    if (!id || !items.some((d) => d.id === id && d.lat !== null)) return;
    select(id, true); // DogMap applies it once the map is ready
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickChip(c: Chip) {
    if (c === "near") {
      if (!("geolocation" in navigator)) return toast("This browser can’t share your location.");
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          setChip("near");
          setView({ mode: "near", seq: Date.now(), center: [pos.coords.longitude, pos.coords.latitude] });
        },
        () => {
          setLocating(false);
          toast("Location is off — showing all of India instead.");
        },
        { timeout: 10_000, maximumAge: 300_000 },
      );
      return;
    }
    setChip(c);
    setView({ mode: c, seq: Date.now() });
  }

  // ---- status check
  const [statusQuery, setStatusQuery] = useState("");
  const [statusResult, setStatusResult] = useState<StatusResult[] | null>(null);
  async function checkStatus(e: FormEvent) {
    e.preventDefault();
    if (!statusQuery.trim()) return;
    try {
      const res = await fetch(`/api/dogs/status?q=${encodeURIComponent(statusQuery.trim())}`);
      setStatusResult((await res.json()).results);
    } catch {
      toast("Couldn’t check right now. Try again.");
    }
  }

  return (
    <div className="page-shell pt-10 md:pt-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <h1 className="display text-[44px] md:text-[80px]">Fat dogs everywhere</h1>
          <p className="rounded-[16px] bg-yellow-soft px-4 py-2.5 text-[18px] font-extrabold tracking-[0.02em] uppercase md:text-[22px]">
            <CountUp value={total} /> dogs
          </p>
        </div>
        <UploadCTA className="self-start md:self-auto" />
      </header>

      <div className="mt-6 flex flex-wrap gap-3" role="group" aria-label="Map area">
        {(
          [
            ["india", "India"],
            ["delhi", "Delhi"],
            ["near", "Near me"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={chip === id}
            onClick={() => pickChip(id)}
            className={cx(
              "flex h-12 items-center gap-2 rounded-full border px-6 text-[16px] font-medium uppercase transition-colors",
              chip === id ? "border-ink bg-ink text-bg" : "border-border bg-surface text-ink hover:bg-bg-soft",
            )}
          >
            {id === "near" && <LocateFixed aria-hidden className={cx("size-4", locating && "animate-spin")} />}
            {id === "near" && locating ? "Locating…" : label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 nav:grid-cols-[minmax(0,1fr)_minmax(320px,0.43fr)] nav:gap-6">
        <div className="relative h-[440px] overflow-hidden rounded-[24px] border border-border shadow-soft nav:h-[clamp(520px,calc(100dvh-300px),780px)]">
          <DogMap dogs={mapDogs} view={view} focus={focus} hoverId={hoverId} onSelect={(id) => select(id, false)} />
        </div>

        <aside aria-label="Dogs on the map" className="flex flex-col nav:h-[clamp(520px,calc(100dvh-300px),780px)]">
          <label htmlFor="map-search" className="mb-2 text-[18px] font-semibold">
            Find a dog or place
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-2" />
            <input
              id="map-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, city or breed"
              autoComplete="off"
              className="h-14 w-full rounded-[14px] border border-border bg-surface pr-4 pl-12 text-[17px] placeholder:text-ink-3 focus-visible:rounded-[14px]"
            />
          </div>
          <p className="mt-2 text-[13px] text-ink-3" aria-live="polite">
            {q ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}` : `${filtered.length} dogs · tournament dogs first`}
          </p>

          <div ref={listRef} className="mt-2 h-[560px] overflow-y-auto overscroll-contain pr-1 nav:h-auto nav:min-h-0 nav:flex-1">
            {filtered.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-ink-2">No dogs match “{query.trim()}”.</p>
            ) : (
              <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((v) => {
                  const { dog, number } = filtered[v.index];
                  return (
                    <li key={dog.id} className="absolute inset-x-0 top-0 px-0.5" style={{ transform: `translateY(${v.start}px)` }}>
                      <DogListCard
                        dog={dog}
                        number={number}
                        active={activeId === dog.id}
                        onHover={setHoverId}
                        onSelect={(id) => select(id, true)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form onSubmit={checkStatus} className="mt-4 rounded-[18px] border border-border bg-surface p-4">
            <label htmlFor="status-q" className="text-[15px] text-ink">
              Uploaded a dog? <strong>Check its status</strong>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="status-q"
                value={statusQuery}
                onChange={(e) => setStatusQuery(e.target.value)}
                placeholder="Submission ID, dog’s name or @handle"
                className="h-11 min-w-0 flex-1 rounded-[12px] border border-border bg-bg px-3 text-[15px] placeholder:text-ink-3 focus-visible:rounded-[12px]"
              />
              <button type="submit" className="h-11 shrink-0 rounded-[12px] bg-ink px-5 text-[15px] font-semibold text-bg hover:bg-[#3a2418]">
                Check
              </button>
            </div>
            {statusResult && (
              <ul className="mt-3 space-y-2" aria-live="polite">
                {statusResult.length === 0 ? (
                  <li className="text-[14px] text-ink-2">No submission found. Check the ID from your confirmation screen.</li>
                ) : (
                  statusResult.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 text-[14px]">
                      <span className="min-w-0 truncate">
                        <strong>{r.name}</strong> · {r.area} <span className="text-ink-3">({r.id})</span>
                      </span>
                      <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize", STATUS_STYLE[r.status])}>
                        {r.status}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </form>
        </aside>
      </div>
    </div>
  );
}
