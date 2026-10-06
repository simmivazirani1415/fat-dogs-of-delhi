"use client";

import { ChevronRight } from "lucide-react";
import { Paw, SocialGlyph } from "@/components/icons";
import type { MapDog } from "@/lib/mapDogs";
import { cx } from "@/lib/format";

const RANK_BG: Record<number, string> = { 1: "bg-yellow", 2: "bg-silver", 3: "bg-bronze-soft text-[#6D2F1C]" };

export function DogListCard({
  dog,
  number,
  active,
  onHover,
  onSelect,
}: {
  dog: MapDog;
  number: number;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const unplaced = dog.lat === null;
  return (
    <button
      type="button"
      data-list-dog={dog.id}
      onMouseEnter={() => onHover(dog.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(dog.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(dog.id)}
      disabled={unplaced}
      className={cx(
        "group/card flex h-[96px] w-full items-center gap-3 rounded-[18px] border bg-surface px-3 text-left transition-[transform,box-shadow,border-color] duration-200 ease-out-soft focus-visible:rounded-[18px]",
        "enabled:hover:-translate-y-0.5 enabled:hover:shadow-lift disabled:cursor-default",
        active ? "border-yellow shadow-[0_0_0_3px_rgba(252,216,119,0.7)]" : "border-border",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "grid size-10 shrink-0 place-items-center rounded-full text-[16px] font-bold tabular",
          RANK_BG[number] ?? "bg-yellow-soft",
          number > 99 && "text-[13px]",
        )}
      >
        {number}
      </span>
      <span className="relative size-[72px] shrink-0">
        <span className="block size-full overflow-hidden rounded-[14px] bg-yellow-soft">
          {dog.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dog.photo}
              alt=""
              loading="lazy"
              className={cx("size-full object-cover", dog.kind === "tournament" && "dog-photo-fill")}
            />
          ) : (
            <span className="grid size-full place-items-center text-orange">
              <Paw className="size-7" />
            </span>
          )}
        </span>
        {dog.handle && (
          <span className="absolute -right-1.5 -bottom-1 grid size-6 place-items-center rounded-[8px] bg-white shadow-soft">
            <SocialGlyph platform={dog.platform ?? "instagram"} size={14} variant="color" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[17px] leading-tight font-bold text-ink">{dog.name}</span>
        <span className="mt-0.5 block truncate text-[14px] text-ink-2">{unplaced ? `${dog.place} · not on the map yet` : dog.place}</span>
      </span>
      {!unplaced && <span className="sr-only">. Show on map</span>}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2 transition-transform duration-150 group-enabled/card:group-hover/card:translate-x-1" />
    </button>
  );
}
