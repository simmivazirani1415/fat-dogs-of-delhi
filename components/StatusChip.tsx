import type { Dog } from "@/lib/dogs";
import { isAlive } from "@/lib/dogs";
import { cx } from "@/lib/format";

/** "In R16" (green) for dogs still in the tournament, "Out in R32" (muted) for eliminated ones. */
export function StatusChip({ dog, className }: { dog: Dog; className?: string }) {
  const alive = isAlive(dog);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        alive ? "bg-[#E3F4E1] text-[#2F6B2A]" : "bg-bg-soft text-ink-3",
        className,
      )}
    >
      {alive && <span aria-hidden className="size-1.5 rounded-full bg-[#3C8A34]" />}
      {dog.statusLabel}
    </span>
  );
}
