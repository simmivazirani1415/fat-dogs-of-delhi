"use client";

import { CTAButton } from "@/components/CTAButton";
import { useUpload } from "@/components/providers/UploadProvider";

/** "Upload your fat dog / Put them on the India map." — the stacked yellow CTA that opens the Add-a-dog modal. */
export function UploadCTA({ size = "md", className }: { size?: "md" | "nav"; className?: string }) {
  const { open } = useUpload();
  return (
    <CTAButton
      variant="primary-stacked"
      size={size}
      subLabel="Put them on the India map."
      onClick={open}
      aria-haspopup="dialog"
      className={className}
    >
      Upload your fat dog
    </CTAButton>
  );
}
