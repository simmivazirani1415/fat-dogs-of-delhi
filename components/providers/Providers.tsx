"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { DogSheetProvider } from "@/components/DogDetailSheet";
import { SoundProvider } from "@/components/providers/SoundProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { UploadProvider } from "@/components/providers/UploadProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <SoundProvider>
          <UploadProvider>
            <DogSheetProvider>{children}</DogSheetProvider>
          </UploadProvider>
        </SoundProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
