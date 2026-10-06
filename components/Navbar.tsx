"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CTAButton } from "@/components/CTAButton";
import { UploadCTA } from "@/components/UploadCTA";
import { InstagramGlyph, Paw, XGlyph } from "@/components/icons";
import { cx } from "@/lib/format";
import { spring } from "@/lib/motion";

export const NAV_LINKS = [
  { href: "/dogs/map", label: "Dog map" },
  { href: "/predictions", label: "Predictions" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/bracket", label: "My bracket" },
] as const;

export const SOCIALS = [
  { platform: "instagram", href: "https://www.instagram.com/fatdogsofdelhi/", handle: "@fatdogsofdelhi", label: "Instagram" },
  { platform: "x", href: "https://x.com/fatdogsofdelhi", handle: "@fatdogsofdelhi", label: "X" },
] as const;

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** Two short orange lines with a paw between them — sits 6px under the active label. */
function PawUnderline({ hover = false }: { hover?: boolean }) {
  const line = "h-[2.5px] w-6 rounded-full bg-current transition-transform duration-200 ease-out-soft";
  return (
    <span
      aria-hidden
      className={cx(
        "pointer-events-none absolute top-full left-1/2 mt-1.5 flex -translate-x-1/2 items-center gap-1 text-orange",
        hover && "opacity-0 transition-opacity duration-200 group-hover/link:opacity-100",
      )}
    >
      <span className={cx(line, "origin-right", hover && "scale-x-0 group-hover/link:scale-x-100")} />
      <Paw size={16} className="group-hover/link:animate-[paw-wiggle_420ms_ease-in-out]" />
      <span className={cx(line, "origin-left", hover && "scale-x-0 group-hover/link:scale-x-100")} />
    </span>
  );
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Fat Dogs of Delhi — home"
      // no outline box around the logo; keyboard focus shows as a gentle dim instead
      className="shrink-0 rounded-xl focus-visible:opacity-70 focus-visible:outline-none"
    >
      <Image
        src="/brand/logo-cutout.png"
        alt="Fat Dogs of Delhi"
        width={994}
        height={280}
        priority
        className={cx("w-auto transition-[height] duration-250 ease-out-soft", compact ? "h-10 nav:h-12" : "h-11 nav:h-[52px]")}
      />
    </Link>
  );
}

function Socials({ stacked = false }: { stacked?: boolean }) {
  return (
    <ul className={cx("flex", stacked ? "flex-col gap-4" : "items-center gap-5")}>
      {SOCIALS.map((s) => (
        <li key={s.platform}>
          <a
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${s.label} ${s.handle}`}
            className="group/social flex items-center gap-2 rounded-full text-[15px] font-medium text-ink"
          >
            <span className="transition-transform duration-150 ease-out-soft group-hover/social:-translate-y-0.5">
              {s.platform === "instagram" ? <InstagramGlyph size={26} /> : <XGlyph size={24} />}
            </span>
            <span className={stacked ? "" : "hidden wide:inline"}>{s.handle}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  return (
    <header className="page-shell sticky top-4 z-50">
      <nav
        aria-label="Main"
        className={cx(
          "flex items-center gap-4 rounded-full border border-border shadow-soft",
          "transition-[padding,background-color,backdrop-filter] duration-250 ease-out-soft",
          "pr-2 pl-5 nav:gap-6 nav:pr-3 nav:pl-8",
          scrolled ? "bg-surface/92 py-1.5 backdrop-blur-md nav:py-[14px]" : "bg-surface py-2.5 nav:py-4",
        )}
      >
        <Logo compact={scrolled} />

        {/* desktop links */}
        <ul className="ml-auto hidden items-center gap-2 nav:flex lg:gap-4">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "group/link relative block rounded-full px-2 py-3 text-[16px] whitespace-nowrap transition-colors duration-150 xl:px-3 xl:text-[17px]",
                    active ? "font-semibold text-orange" : "text-ink hover:text-ink",
                  )}
                >
                  <span className="relative">
                    {link.label}
                    {active ? (
                      <motion.span layoutId="nav-underline" transition={spring} className="pointer-events-none absolute inset-0">
                        <PawUnderline />
                      </motion.span>
                    ) : (
                      <PawUnderline hover />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden nav:ml-2 nav:block">
          <CTAButton href="/bracket/matchups" size="nav" className="max-lg:hidden">
            Make your pick
          </CTAButton>
          <CTAButton href="/bracket/matchups" size="nav" iconOnly className="lg:hidden">
            Make your pick
          </CTAButton>
        </div>

        {/* 900–1279px: no room for socials in the bar (they stay in the footer + mobile sheet) */}
        <span aria-hidden className="hidden h-9 w-px bg-border xl:block" />
        <div className="hidden pr-3 xl:block">
          <Socials />
        </div>

        {/* mobile */}
        <div className="ml-auto flex items-center gap-2 nav:hidden">
          <CTAButton href="/bracket/matchups" size="nav" iconOnly>
            Make your pick
          </CTAButton>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-12 place-items-center rounded-full bg-bg-soft text-ink"
          >
            {menuOpen ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="scrim"
              aria-hidden
              className="fixed inset-0 -z-10 bg-ink/30 nav:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="sheet"
              id="mobile-menu"
              className="absolute inset-x-[var(--gutter)] top-full mt-3 rounded-[28px] border border-border bg-surface p-6 shadow-lift nav:hidden"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={spring}
            >
              <ul className="flex flex-col">
                {NAV_LINKS.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href} className="border-b border-border last:border-0">
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "flex items-center justify-between py-4 text-[22px]",
                          active ? "font-semibold text-orange" : "text-ink",
                        )}
                      >
                        {link.label}
                        {active && <Paw size={18} className="text-orange" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <UploadCTA size="nav" className="mt-5 w-full" />
              <div className="mt-6 border-t border-border pt-6">
                <Socials stacked />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
