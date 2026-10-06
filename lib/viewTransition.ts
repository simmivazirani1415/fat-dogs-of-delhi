"use client";

import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

export const dogTransitionName = (dogId: string) => `dog-${dogId}`;

/**
 * Navigate with a shared-element morph (View Transitions API).
 * The source element gets `view-transition-name: dog-{id}` for the old snapshot; the destination page
 * gives its matching photo the same name. The transition waits until the old page has unmounted
 * (source disconnected) so the new snapshot contains the destination element.
 * Falls back to a plain push when unsupported or when the user prefers reduced motion.
 */
export function navigateWithMorph(router: Router, href: string, source: HTMLElement | null, dogId: string) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!source || reduced || typeof document.startViewTransition !== "function") {
    router.push(href);
    return;
  }
  source.style.viewTransitionName = dogTransitionName(dogId);
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        router.push(href, { scroll: false }); // the destination scrolls to the dog itself
        // Poll with timers: rendering (and so requestAnimationFrame) is paused while this callback is pending.
        const started = performance.now();
        const check = () => {
          const arrived = !source.isConnected && document.querySelector(`[data-vt-dog="${dogId}"]`);
          if (arrived || performance.now() - started > 1500) resolve();
          else setTimeout(check, 16);
        };
        setTimeout(check, 16);
      }),
  );
}
