"use client";

import Image from "next/image";
import { Check, Crown, X } from "lucide-react";
import { champion, matchupDogs, realResult, ROUND_OFFSET, ROUNDS, type Picks } from "@/lib/bracket";
import { getDog } from "@/lib/dogs";
import { cx } from "@/lib/format";

const CELL_W = "w-[92px]";

function MatchCell({
  picks,
  index,
  side,
  onEdit,
}: {
  picks: Picks;
  index: number;
  side: "left" | "right" | "center";
  onEdit?: (index: number) => void;
}) {
  const dogs = matchupDogs(picks, index);
  const winner = picks[index];
  const result = winner ? realResult(picks, index) : null;
  return (
    <div
      className={cx(
        "relative z-10 rounded-[10px] border border-border bg-surface p-1 shadow-[0_1px_0_rgba(120,72,20,0.08)]",
        CELL_W,
        // stub line toward the next round
        side === "left" && "after:absolute after:top-1/2 after:left-full after:h-0.5 after:w-2 after:bg-[#D9CBB8]",
        side === "right" && "after:absolute after:top-1/2 after:right-full after:h-0.5 after:w-2 after:bg-[#D9CBB8]",
      )}
    >
      {dogs.map((id, s) => {
        const won = !!id && id === winner;
        const content = (
          <>
            {id ? (
              <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-yellow">
                <Image src={getDog(id).image} alt="" fill sizes="24px" className="object-cover" />
              </span>
            ) : (
              <span className="size-6 shrink-0 rounded-full border border-dashed border-ink/25" />
            )}
            <span className="min-w-0 flex-1 truncate text-left">{id ? getDog(id).name : "TBD"}</span>
            {won && result && (result === winner ? <Check aria-label="correct" className="size-3 text-[#3C8A34]" strokeWidth={3} /> : <X aria-label="wrong" className="size-3 text-ink-3" strokeWidth={3} />)}
          </>
        );
        const cls = cx(
          "flex h-[26px] w-full items-center gap-1.5 rounded-[7px] px-1 text-[11px] leading-none",
          won ? "bg-yellow-soft font-bold text-ink" : winner ? "text-ink-3" : "text-ink-2",
        );
        return onEdit && id ? (
          <button
            key={s}
            type="button"
            onClick={() => onEdit(index)}
            title={`Edit match: ${getDog(dogs[0]!)?.name ?? "TBD"} vs ${dogs[1] ? getDog(dogs[1]).name : "TBD"}`}
            className={cx(cls, "hover:bg-yellow/40 focus-visible:rounded-[7px]")}
          >
            {content}
          </button>
        ) : (
          <div key={s} className={cls}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

/** A column of matches for one round in one half; pairs are joined by a bracket line toward the next round. */
function Column({
  picks,
  round,
  from,
  count,
  side,
  onEdit,
}: {
  picks: Picks;
  round: number;
  from: number;
  count: number;
  side: "left" | "right";
  onEdit?: (index: number) => void;
}) {
  const indexes = Array.from({ length: count }, (_, i) => ROUND_OFFSET[round] + from + i);
  const pairs = count > 1 ? Array.from({ length: count / 2 }, (_, p) => indexes.slice(p * 2, p * 2 + 2)) : [indexes];
  return (
    <div className="flex flex-col">
      <p className="mb-2 text-center text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">{ROUNDS[round].short}</p>
      <div className="flex flex-1 flex-col justify-around">
        {pairs.map((pair, p) => (
          <div
            key={p}
            className={cx(
              "relative flex flex-1 flex-col justify-around gap-2 py-1",
              pair.length === 2 &&
                (side === "left"
                  ? "before:absolute before:top-1/4 before:bottom-1/4 before:left-[calc(100%+8px)] before:w-0.5 before:bg-[#D9CBB8] after:absolute after:top-1/2 after:left-[calc(100%+8px)] after:h-0.5 after:w-2 after:bg-[#D9CBB8]"
                  : "before:absolute before:top-1/4 before:right-[calc(100%+8px)] before:bottom-1/4 before:w-0.5 before:bg-[#D9CBB8] after:absolute after:top-1/2 after:right-[calc(100%+8px)] after:h-0.5 after:w-2 after:bg-[#D9CBB8]"),
            )}
          >
            {pair.map((i) => (
              <MatchCell key={i} picks={picks} index={i} side={side} onEdit={onEdit} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** All six rounds; left half (matches 1–16) flows right, right half (17–32) flows left, final in the middle. */
export function FullBracket({ picks, onEdit }: { picks: Picks; onEdit?: (index: number) => void }) {
  const champ = champion(picks);
  // [round, start within round, count] per half
  const left = [[0, 0, 16], [1, 0, 8], [2, 0, 4], [3, 0, 2], [4, 0, 1]] as const;
  const right = [[4, 1, 1], [3, 2, 2], [2, 4, 4], [1, 8, 8], [0, 16, 16]] as const;
  return (
    <div className="overflow-x-auto pb-3 [scrollbar-width:thin]">
      <div className="mx-auto flex h-[1110px] w-max items-stretch gap-4 px-2">
        {left.map(([r, from, count]) => (
          <Column key={`l${r}`} picks={picks} round={r} from={from} count={count} side="left" onEdit={onEdit} />
        ))}
        <div className="flex w-[140px] flex-col items-center justify-center gap-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Final</p>
          <MatchCell picks={picks} index={62} side="center" onEdit={onEdit} />
          <div className="flex flex-col items-center">
            <Crown aria-hidden className="size-7 text-[#E9A419]" fill="currentColor" />
            <span className="relative mt-1 size-24 overflow-hidden rounded-full bg-yellow ring-4 ring-yellow">
              {champ && <Image src={getDog(champ).image} alt="" fill sizes="96px" className="object-cover" />}
            </span>
            <p className="mt-2 text-center text-[13px] font-bold">{champ ? getDog(champ).name : "Your champion"}</p>
            <p className="text-[11px] text-ink-3 uppercase">Champion</p>
          </div>
        </div>
        {right.map(([r, from, count]) => (
          <Column key={`r${r}`} picks={picks} round={r} from={from} count={count} side="right" onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
