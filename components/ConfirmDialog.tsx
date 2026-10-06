"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { spring } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";

/** Small modal confirm (focus-trapped, Esc cancels). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Continue",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onCancel);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-4">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            ref={ref}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={body ? "confirm-body" : undefined}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={spring}
            className="relative w-full max-w-[420px] rounded-[28px] bg-surface p-6 shadow-lift"
          >
            <h2 id="confirm-title" className="text-[20px] font-bold">
              {title}
            </h2>
            {body && (
              <p id="confirm-body" className="mt-2 text-[15px] text-ink-2">
                {body}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onCancel} className="h-11 rounded-full border border-ink/15 px-5 font-semibold hover:bg-bg-soft">
                Cancel
              </button>
              <button
                type="button"
                data-autofocus
                onClick={onConfirm}
                className="h-11 rounded-full bg-yellow px-5 font-semibold hover:bg-yellow-hover"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
