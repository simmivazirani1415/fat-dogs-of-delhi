"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/components/providers/SoundProvider";
import { cx } from "@/lib/format";

/**
 * Round 64px speaker. Position it with `className` — it belongs to the hero, not the viewport.
 * Plays /audio/dog-party.mp3 on click only; disabled with a tooltip if the file is missing.
 */
export function SoundToggle({ className }: { className?: string }) {
  const { available, playing, toggle } = useSound();
  const missing = available === false;
  const label = missing ? "Sound coming soon" : playing ? "Pause music" : "Play dog party music";

  return (
    <span className={cx("inline-block", className)}>
    <span className="group/sound relative grid size-16 place-items-center">
      {/* sound-wave rings while playing */}
      {playing &&
        [0, 0.4, 0.8].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-orange/70 motion-safe:animate-[sound-ring_1.2s_var(--ease-out)_infinite]"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      <button
        type="button"
        onClick={toggle}
        disabled={missing || available === null}
        aria-pressed={playing}
        aria-label={label}
        title={missing ? "Sound coming soon" : undefined}
        className={cx(
          "relative grid size-16 place-items-center rounded-full bg-bg-soft text-orange shadow-soft",
          "transition-[transform,background-color,box-shadow] duration-150 ease-out-soft",
          "hover:-translate-y-0.5 hover:bg-yellow-soft hover:shadow-lift active:scale-95",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
          playing && "bg-yellow-soft",
        )}
      >
        {playing ? <VolumeX aria-hidden className="size-7" strokeWidth={2} /> : <Volume2 aria-hidden className="size-7" strokeWidth={2} />}
      </button>
      {missing && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[13px] text-bg opacity-0 transition-opacity group-hover/sound:opacity-100"
        >
          Sound coming soon
        </span>
      )}
    </span>
    </span>
  );
}
