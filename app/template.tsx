"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { easeOut } from "@/lib/motion";

/** Page content slides up 12px on navigation (no fade, so content paints before hydration); Navbar and Footer live in the layout and stay put. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.25, ease: easeOut }}>
      {children}
    </motion.div>
  );
}
