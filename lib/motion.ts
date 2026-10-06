// Motion tokens. Reduced motion is handled globally by <MotionConfig reducedMotion="user">,
// plus useReducedMotion() where a component swaps behaviour (float, bob, parallax, count-ups).
import type { Transition } from "motion/react";

export const spring: Transition = { type: "spring", stiffness: 380, damping: 26 };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 24 };
export const easeOut = [0.22, 1, 0.36, 1] as const;

export const dur = { hover: 0.15, state: 0.25, enter: 0.45, count: 0.9 } as const;
