"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap } from "maplibre-gl";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { INDIA_VIEW, MAP_STYLE_URL, tintMap } from "@/components/map/mapStyle";
import { cx } from "@/lib/format";

export type MapLib = typeof import("maplibre-gl");

/**
 * Cream-tinted MapLibre map. Loads maplibre-gl on demand (import this component with next/dynamic,
 * ssr: false) and hands the map + library to `onReady` once the style has loaded.
 * Shared by the Add-a-dog LocationPicker and the Dog map page.
 */
export default function BaseMap({
  onReady,
  initialView = INDIA_VIEW,
  className,
  zoomControl = "top-right",
  label = "Map",
}: {
  onReady: (map: MLMap, lib: MapLib) => void;
  initialView?: { center: [number, number]; zoom: number };
  className?: string;
  zoomControl?: "top-right" | "bottom-left" | false;
  label?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    let map: MLMap | null = null;
    (async () => {
      try {
        const lib = await import("maplibre-gl");
        if (cancelled || !container.current) return;
        // worker copied to /public by scripts/copy-maplibre-worker.mjs
        lib.setWorkerUrl(`/vendor/maplibre-${lib.getVersion()}/maplibre-gl-worker.mjs`);
        map = new lib.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: initialView.center,
          zoom: initialView.zoom,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          cooperativeGestures: false,
        });
        map.touchZoomRotate.disableRotation();
        mapRef.current = map;
        if (process.env.NODE_ENV !== "production") {
          // dev-only handle for QA scripts (scripts/verify-*.ts)
          const w = window as unknown as { __maps?: MLMap[] };
          (w.__maps ??= []).push(map);
        }
        map.on("error", (e) => {
          // tile hiccups are fine; only a failed style is fatal
          if (!map?.isStyleLoaded() && String(e.error?.message ?? "").includes("style")) setState("error");
        });
        map.once("load", () => {
          if (cancelled || !map) return;
          tintMap(map);
          // start the compact attribution collapsed (the ⓘ button still expands it); MapLibre re-opens it
          // once after the first render, so collapse again when the map first goes idle
          const collapse = () => {
            const attrib = container.current?.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
            attrib?.classList.remove("maplibregl-compact-show");
            attrib?.removeAttribute("open"); // it is a <details>
          };
          collapse();
          map.once("idle", collapse);
          setState("ready");
          onReadyRef.current(map, lib);
        });
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // initial view only matters on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cx("relative overflow-hidden bg-[#F3EBD9]", className)}>
      {/* inline position: maplibre-gl.css sets .maplibregl-map { position: relative }, which would collapse it */}
      <div ref={container} style={{ position: "absolute", inset: 0 }} role="region" aria-label={label} />
      {state === "loading" && (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#F3EBD9_30%,#FBF6EF_50%,#F3EBD9_70%)] bg-[length:200%_100%]" />
      )}
      {state === "error" && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-[14px] text-ink-2">
          The map couldn’t load. Check your connection — you can still type the area above.
        </p>
      )}
      {zoomControl && state === "ready" && (
        <div
          className={cx(
            "absolute z-10 flex flex-col overflow-hidden rounded-[14px] bg-surface shadow-soft",
            zoomControl === "top-right" ? "top-3 right-3" : "bottom-4 left-4",
          )}
        >
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn()}
            className="grid size-11 place-items-center border-b border-border text-ink hover:bg-bg-soft focus-visible:rounded-none"
          >
            <Plus aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut()}
            className="grid size-11 place-items-center text-ink hover:bg-bg-soft focus-visible:rounded-none"
          >
            <Minus aria-hidden className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
