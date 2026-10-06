"use client";

import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// The modal (and MapLibre inside it) is only downloaded when someone opens it.
const AddDogModal = dynamic(() => import("@/components/map/AddDogModal"), { ssr: false });

type UploadState = {
  isOpen: boolean;
  /** Opens the Add-a-dog modal. Focus returns to the previously focused element (the trigger) on close. */
  open: () => void;
  close: () => void;
};

const UploadContext = createContext<UploadState | null>(null);

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used inside <UploadProvider>");
  return ctx;
}

/** Opens the modal for `?upload=1` links (e.g. /?upload=1). Isolated in its own Suspense boundary. */
function UploadQueryWatcher({ onOpen }: { onOpen: () => void }) {
  const params = useSearchParams();
  const wants = params.get("upload") === "1";
  useEffect(() => {
    if (wants) onOpen();
  }, [wants, onOpen]);
  return null;
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => {
    setOpen(false);
    // drop ?upload=1 so a refresh / back doesn't reopen it
    const url = new URL(window.location.href);
    if (url.searchParams.has("upload")) {
      url.searchParams.delete("upload");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);

  // warm the chunk on idle so the first open is instant
  useEffect(() => {
    const id = window.setTimeout(() => void import("@/components/map/AddDogModal"), 4000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <UploadContext.Provider value={{ isOpen, open, close }}>
      {children}
      <Suspense fallback={null}>
        <UploadQueryWatcher onOpen={open} />
      </Suspense>
      <AnimatePresence>{isOpen && <AddDogModal key="add-dog" onClose={close} />}</AnimatePresence>
    </UploadContext.Provider>
  );
}
