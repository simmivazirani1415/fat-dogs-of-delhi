"use client";

import dynamic from "next/dynamic";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import { circlePolygon } from "@/components/map/mapStyle";
import type { MapLib } from "@/components/map/BaseMap";
import { snapToGrid, type Precision } from "@/lib/uploadRules";

const BaseMap = dynamic(() => import("@/components/map/BaseMap"), {
  ssr: false,
  loading: () => <div aria-hidden className="absolute inset-0 animate-pulse bg-[#F3EBD9]" />,
});

export type PickedPoint = { lat: number; lng: number };

/** Dog-photo pin: round photo with a yellow ring, a pointer tail and a dot. */
function makePinElement(photo: string) {
  const el = document.createElement("div");
  el.className = "dog-pin";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <span class="dog-pin__photo"><img alt="" draggable="false" /></span>
    <span class="dog-pin__tail"></span>
    <span class="dog-pin__dot"></span>`;
  el.querySelector("img")!.src = photo;
  return el;
}

/**
 * Mini map with a draggable dog pin. Approximate → the stored point snaps to a ~1 km grid
 * and a translucent 1 km circle is drawn; exact → the pin's position as-is.
 */
export function LocationPicker({
  value,
  precision,
  photo,
  flyTo,
  onChange,
}: {
  value: PickedPoint;
  precision: Precision;
  photo: string;
  /** bump to fly the map to `value` (e.g. after "Use my location") */
  flyTo: number;
  onChange: (p: PickedPoint) => void;
}) {
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const drawCircle = useCallback((p: PickedPoint, prec: Precision) => {
    const map = mapRef.current;
    const src = map?.getSource("accuracy") as GeoJSONSource | undefined;
    if (!src) return;
    const c = snapToGrid(p.lat, p.lng);
    src.setData(
      prec === "approximate"
        ? { type: "FeatureCollection", features: [circlePolygon(c.lng, c.lat, 1000)] }
        : { type: "FeatureCollection", features: [] },
    );
  }, []);

  const onReady = useCallback(
    (map: MLMap, lib: MapLib) => {
      mapRef.current = map;
      // frame all of India whatever the box size, leaving room above for the pin photo
      map.fitBounds([[70, 9], [94, 29.5]], { padding: { top: 100, bottom: 0, left: 0, right: 0 }, duration: 0 });
      map.addSource("accuracy", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "accuracy-fill", type: "fill", source: "accuracy", paint: { "fill-color": "#E5860B", "fill-opacity": 0.16 } });
      map.addLayer({
        id: "accuracy-line",
        type: "line",
        source: "accuracy",
        paint: { "line-color": "#E5860B", "line-opacity": 0.6, "line-width": 1.5, "line-dasharray": [2, 2] },
      });
      const marker = new lib.Marker({ element: makePinElement(photo), draggable: true, anchor: "bottom" })
        .setLngLat([value.lng, value.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onChangeRef.current({ lat, lng });
      });
      map.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
      markerRef.current = marker;
      drawCircle(value, precision);
    },
    // the map is created once; later changes flow through the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    markerRef.current?.setLngLat([value.lng, value.lat]);
    drawCircle(value, precision);
  }, [value, precision, drawCircle]);

  useEffect(() => {
    const img = markerRef.current?.getElement().querySelector("img");
    if (img) img.src = photo;
  }, [photo]);

  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo({ center: [value.lng, value.lat], zoom: 13.5, duration: 1200, essential: true });
    // only when asked to
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo]);

  return <BaseMap onReady={onReady} initialView={{ center: [81.2, 22.4], zoom: 3.35 }} className="!absolute inset-0" label="Location picker map. Drag the pin or click to place it." />;
}
