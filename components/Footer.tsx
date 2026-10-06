import { Paw } from "@/components/icons";

const INSTAGRAM = "https://www.instagram.com/fatdogsofdelhi/";

/** Soft blobby shapes in the band's corners (decorative). */
function CornerBlobs() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full text-yellow/20"
      preserveAspectRatio="none"
      viewBox="0 0 1440 160"
    >
      <path fill="currentColor" d="M0 18c40-6 70 6 64 26-6 22-46 24-40 52 6 26 70 30 88 64H0Z" />
      <path
        fill="currentColor"
        d="M1440 0v160h-180c-6-26 26-40 4-62-20-20-74-6-82-34-8-26 30-44 70-50 44-6 70 18 104 6 30-10 30-20 84-20Z"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-24">
      <div className="relative overflow-hidden rounded-t-[32px] border-t border-yellow/20 bg-yellow-soft/40">
        <CornerBlobs />
        <div className="page-shell relative flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-[17px] text-ink md:pl-[46px]">Celebrating Delhi’s chonkiest, cutest, and most loved dogs.</p>
            <div className="group/shout flex items-center gap-3">
              <Paw
                size={34}
                className="shrink-0 text-yellow group-hover/shout:animate-[paw-hop_380ms_var(--ease-out)]"
              />
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-yellow px-6 py-3 text-[17px] font-extrabold tracking-[0.01em] text-ink uppercase underline decoration-2 underline-offset-[3px] transition-colors duration-150 hover:bg-yellow-hover sm:text-[19px]"
              >
                Shoutout to @fatdogsofdelhi
              </a>
              <Paw
                size={34}
                className="shrink-0 rotate-12 text-yellow group-hover/shout:animate-[paw-hop_380ms_var(--ease-out)_60ms]"
              />
            </div>
          </div>
          <p className="flex items-center gap-3 text-[15px] text-ink md:pt-8">
            © 2026 Fat Dogs of Delhi. All tails rights reserved.
            <Paw size={30} className="shrink-0 rotate-12 text-yellow" />
          </p>
        </div>
      </div>
    </footer>
  );
}
