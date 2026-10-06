/** Empty-state illustration: a round sleepy dog (decorative). */
export function SleepyDog({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" aria-hidden className={className} fill="none">
      <ellipse cx="100" cy="108" rx="78" ry="8" fill="var(--bg-soft)" />
      <path d="M38 96c0-30 26-50 62-50s62 20 62 50c0 8-6 12-14 12H52c-8 0-14-4-14-12Z" fill="#E9C9A0" />
      <path d="M150 92c10-2 18 2 22-6 3-6-2-12-8-9-5 3-6 9-14 11" stroke="#C99A66" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="62" cy="80" rx="28" ry="24" fill="#F1D7B3" />
      <path d="M40 66c-8-2-14 8-10 18 3 7 10 6 13 0" fill="#C99A66" />
      <path d="M78 60c8-6 18 0 16 10-1 6-8 8-12 3" fill="#C99A66" />
      <path d="M50 80q5 4 10 0M66 80q5 4 10 0" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="63" cy="90" rx="5" ry="3.5" fill="var(--ink)" />
      <text x="98" y="40" fontFamily="var(--font-outfit)" fontWeight="800" fontSize="16" fill="var(--ink-3)">z</text>
      <text x="110" y="28" fontFamily="var(--font-outfit)" fontWeight="800" fontSize="20" fill="var(--ink-3)">z</text>
      <text x="126" y="14" fontFamily="var(--font-outfit)" fontWeight="800" fontSize="24" fill="var(--ink-3)">Z</text>
    </svg>
  );
}

/** Loading spinner: a little dog with a wagging tail. */
export function WaggingTail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden className={className} fill="none">
      <ellipse cx="18" cy="15" rx="12" ry="7" fill="currentColor" />
      <circle cx="8" cy="10" r="5" fill="currentColor" />
      <path
        d="M29 13c4-1 6-4 7-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ transformOrigin: "29px 13px", animation: "tail-wag 0.35s ease-in-out infinite alternate" }}
      />
    </svg>
  );
}
