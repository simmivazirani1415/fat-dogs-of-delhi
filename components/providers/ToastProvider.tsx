"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastOptions = { action?: { label: string; onClick: () => void }; duration?: number };
type Toast = { id: number; message: string } & ToastOptions;
const ToastContext = createContext<((message: string, options?: ToastOptions) => void) | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Bottom-centre ink pill, cream text, slides up. Optional action button (e.g. "Undo"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, ...options });
    timer.current = setTimeout(() => setToast(null), options.duration ?? 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-[80]">
        {toast && (
          <p
            key={toast.id}
            className="absolute left-1/2 flex max-w-[calc(100vw-32px)] -translate-x-1/2 animate-[toast-in_250ms_var(--ease-out)] items-center gap-3 rounded-full bg-ink px-5 py-3 text-center text-[15px] font-medium text-bg shadow-lift"
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onClick();
                  setToast(null);
                }}
                className="pointer-events-auto rounded-full bg-yellow px-3 py-1 text-[14px] font-semibold text-ink hover:bg-yellow-hover"
              >
                {toast.action.label}
              </button>
            )}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
