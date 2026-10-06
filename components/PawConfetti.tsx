"use client";

import { motion, useReducedMotion } from "motion/react";
import { Paw } from "@/components/icons";
import { cx } from "@/lib/format";

/** Paw confetti burst (success states). Skipped entirely for reduced motion. */
export function PawConfetti({ count = 18, className }: { count?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const bits = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 3) * 0.2;
    const d = 110 + (i % 4) * 34;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d - 30, r: (i * 47) % 360, c: ["#E5860B", "#FCD877", "#C9785A", "#6B4330"][i % 4], s: 14 + (i % 3) * 6 };
  });
  return (
    <div aria-hidden className={cx("pointer-events-none absolute top-16 left-1/2", className)}>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ color: b.c }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 60], opacity: [0, 1, 0], scale: 1, rotate: b.r }}
          transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.015 }}
        >
          <Paw size={b.s} />
        </motion.span>
      ))}
    </div>
  );
}
