"use client";

import dynamic from "next/dynamic";
import type { Map as MLMap, Marker, Popup } from "maplibre-gl";
import Supercluster, { type ClusterProperties } from "supercluster";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapLib } from "@/components/map/BaseMap";
import { DELHI_BOUNDS, INDIA_BOUNDS } from "@/components/map/mapStyle";
import type { MapDog } from "@/lib/mapDogs";

const BaseMap = dynamic(() => import("@/components/map/BaseMap"), {
  ssr: false,
  loading: () => <div aria-hidden className="absolute inset-0 animate-pulse bg-[#F3EBD9]" />,
});

export type MapView =
  | { mode: "india"; seq: number }
  | { mode: "delhi"; seq: number }
  | { mode: "near"; seq: number; center: [number, number] };

export type FocusRequest = { id: string; fly: boolean; seq: number };

type PointProps = { idx: number; score: number };
type ClusterProps = PointProps & { rep: number };

const IG_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true"><defs><linearGradient id="igm" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stop-color="#F58529"/><stop offset=".5" stop-color="#DD2A7B"/><stop offset="1" stop-color="#8134AF"/></linearGradient></defs><rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" stroke="url(#igm)" stroke-width="2.6"/><circle cx="12" cy="12" r="4.2" stroke="url(#igm)" stroke-width="2.6"/></svg>';
const X_SVG =
  '<svg viewBox="0 0 24 24" width="11" height="11" fill="#24150D" aria-hidden="true"><path d="M17.75 2.5h3.07l-6.7 7.66L22 21.5h-6.17l-4.83-6.32-5.53 6.32H2.4l7.17-8.2L2 2.5h6.33l4.37 5.77 5.05-5.77Z"/></svg>';
const PAW_SVG =
  '<svg viewBox="0 0 24 24" width="26" height="26" fill="#E5860B" aria-hidden="true"><ellipse cx="5.2" cy="10.2" rx="2.3" ry="2.9"/><ellipse cx="9.4" cy="5.6" rx="2.4" ry="3.1"/><ellipse cx="14.6" cy="5.6" rx="2.4" ry="3.1"/><ellipse cx="18.8" cy="10.2" rx="2.3" ry="2.9"/><path d="M12 11.2c-2.9 0-6.3 3.4-6.3 6.3 0 2.1 1.6 3.3 3.4 3.3 1.2 0 1.9-.5 2.9-.5s1.7.5 2.9.5c1.8 0 3.4-1.2 3.4-3.3 0-2.9-3.4-6.3-6.3-6.3Z"/></svg>';

/** Short city-ish label: "Gautam nagar new delhi" → "Gautam nagar new delhi", "SDA Market, Hauz Khas" → "Hauz Khas" */
function cityLabel(place: string) {
  const parts = place.split(",").map((s) => s.trim()).filter(Boolean);
  const label = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
  return label.length > 18 ? label.slice(0, 17) + "…" : label;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
};

function photoEl(dog: MapDog) {
  const wrap = el("span", "dog-marker__photo");
  if (dog.photo) {
    const img = el("img");
    img.src = dog.photo;
    img.alt = "";
    img.loading = "lazy";
    img.draggable = false;
    if (dog.kind === "tournament") img.className = "is-circle-crop";
    wrap.append(img);
  } else {
    wrap.innerHTML = PAW_SVG; // video uploads have no still
    wrap.classList.add("is-placeholder");
  }
  if (dog.handle) {
    const badge = el("span", "dog-marker__badge");
    badge.innerHTML = dog.platform === "x" ? X_SVG : IG_SVG;
    wrap.append(badge);
  }
  return wrap;
}

function popupContent(dog: MapDog) {
  const root = el("div", "dog-popup");
  const media = el("div", "dog-popup__media");
  if (dog.kind === "upload" && dog.mediaType.startsWith("video/") && dog.mediaUrl) {
    const v = el("video");
    v.src = dog.mediaUrl;
    v.controls = true;
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    media.append(v);
  } else {
    const img = el("img");
    img.src = (dog.kind === "upload" ? dog.mediaUrl : dog.photo) ?? dog.photo ?? "";
    img.alt = `${dog.name} from ${dog.place}`;
    if (dog.kind === "tournament") img.className = "is-circle-crop";
    media.append(img);
  }
  root.append(media);
  root.append(el("p", "dog-popup__name", dog.name));
  root.append(el("p", "dog-popup__place", dog.place));
  if (dog.kind === "tournament" && dog.rank) {
    root.append(el("p", "dog-popup__meta", `Tournament dog · #${dog.rank} most picked`));
    const a = el("a", "dog-popup__cta", "See on leaderboard →");
    a.href = `/leaderboard?dog=${dog.id}`;
    root.append(a);
  }
  if (dog.handle && dog.profileUrl) {
    const h = el("a", "dog-popup__handle", `@${dog.handle}`);
    h.href = dog.profileUrl;
    h.target = "_blank";
    h.rel = "noreferrer";
    root.append(h);
    const a = el("a", "dog-popup__cta", dog.platform === "x" ? "Open on X" : "Open on Instagram");
    a.href = dog.profileUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    root.append(a);
  }
  return root;
}

/**
 * The Dog map: supercluster clusters rendered as HTML photo markers on the shared BaseMap.
 * Props drive it: `dogs` (already filtered), `view` (fly-to requests), `focus` (open a popup),
 * `hoverId` (bounce that dog's pin or cluster).
 */
export function DogMap({
  dogs,
  view,
  focus,
  hoverId,
  onSelect,
}: {
  dogs: MapDog[];
  view: MapView;
  focus: FocusRequest | null;
  hoverId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const libRef = useRef<MapLib | null>(null);
  const markers = useRef<{ marker: Marker; el: HTMLElement; ids: Set<string> }[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const hoverRef = useRef(hoverId);
  hoverRef.current = hoverId;

  const placed = useMemo(() => dogs.filter((d) => d.lat !== null && d.lng !== null), [dogs]);
  const index = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({
      radius: 110,
      maxZoom: 15,
      map: (p) => ({ ...p, rep: p.idx }),
      reduce: (acc, p) => {
        if (p.score > acc.score) {
          acc.score = p.score;
          acc.rep = p.rep;
        }
      },
    });
    sc.load(
      placed.map((d, idx) => ({
        type: "Feature" as const,
        properties: {
          idx,
          // cluster photo: best-ranked tournament dog, else the most recent upload
          // (uploads without a still — videos — only win if nothing else is in the cluster)
          score:
            d.kind === "tournament"
              ? 2e13 - (d.rank ?? 999)
              : (d.createdAt ? Date.parse(d.createdAt) : 0) - (d.photo ? 0 : 1e13),
        },
        geometry: { type: "Point" as const, coordinates: [d.lng!, d.lat!] },
      })),
    );
    return sc;
  }, [placed]);

  const applyHover = useCallback(() => {
    for (const m of markers.current) m.el.classList.toggle("is-bouncing", !!hoverRef.current && m.ids.has(hoverRef.current));
  }, []);

  const render = useCallback(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    for (const m of markers.current) m.marker.remove();
    markers.current = [];
    const b = map.getBounds();
    const zoom = Math.round(map.getZoom());
    // render a margin of half a screen around the view so short pans don't pop markers in
    const padLng = (b.getEast() - b.getWest()) / 2;
    const padLat = (b.getNorth() - b.getSouth()) / 2;
    const features = index.getClusters(
      [
        Math.max(-180, b.getWest() - padLng),
        Math.max(-85, b.getSouth() - padLat),
        Math.min(180, b.getEast() + padLng),
        Math.min(85, b.getNorth() + padLat),
      ],
      zoom,
    );

    for (const f of features) {
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const props = f.properties as Partial<ClusterProperties> & ClusterProps;
      const isCluster = !!props.cluster;
      const rep = placed[isCluster ? props.rep : props.idx];
      const root = el("button", isCluster ? "dog-marker is-cluster" : "dog-marker");
      root.type = "button";
      const ids = new Set<string>();
      // keep presses on a marker from reaching the map, or MapLibre treats them as a map click
      // and the popup's closeOnClick shuts the popup we are about to open
      for (const t of ["mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend", "dblclick"])
        root.addEventListener(t, (e) => e.stopPropagation());

      if (isCluster) {
        for (const leaf of index.getLeaves(props.cluster_id!, Infinity)) ids.add(placed[leaf.properties.idx].id);
        root.append(el("span", "dog-marker__count", String(props.point_count)));
        root.append(el("span", "sr-only", " dogs near "));
        root.addEventListener("click", (e) => {
          e.stopPropagation();
          const z = Math.min(index.getClusterExpansionZoom(props.cluster_id!), 16);
          map.easeTo({ center: [lng, lat], zoom: z, duration: 600 });
        });
      } else {
        ids.add(rep.id);
        root.append(el("span", "sr-only", `${rep.name} in `));
        const tip = el("span", "dog-marker__tip");
        tip.append(el("strong", undefined, rep.name), el("span", undefined, rep.place));
        root.append(tip);
        root.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current(rep.id);
        });
      }
      root.append(photoEl(rep));
      root.append(el("span", "dog-marker__label", cityLabel(rep.place)));
      if (isCluster) root.append(el("span", "sr-only", ". Zoom in"));
      root.dataset.markerFor = isCluster ? `cluster-${props.cluster_id}` : rep.id;

      const marker = new lib.Marker({ element: root, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
      markers.current.push({ marker, el: root, ids });
    }
    applyHover();
  }, [index, placed, applyHover]);

  const renderRef = useRef(render);
  renderRef.current = render;

  const onReady = useCallback((map: MLMap, lib: MapLib) => {
    mapRef.current = map;
    libRef.current = lib;
    map.fitBounds(INDIA_BOUNDS, { padding: 30, duration: 0 });
    map.on("moveend", () => renderRef.current());
    renderRef.current();
    setReady(true);
  }, []);

  // re-cluster when the filtered set changes
  useEffect(() => {
    render();
  }, [render]);

  useEffect(applyHover, [hoverId, applyHover]);

  // fly-to requests from the INDIA / DELHI / NEAR ME chips
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !view.seq) return;
    if (view.mode === "india") map.fitBounds(INDIA_BOUNDS, { padding: 30, duration: 1200 });
    else if (view.mode === "delhi") map.fitBounds(DELHI_BOUNDS, { padding: 30, duration: 1200 });
    else map.flyTo({ center: view.center, zoom: 11.5, duration: 1200, essential: true });
  }, [view, ready]);

  // open a popup (marker click, list click, ?dog= deep link)
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    // detach first so the old popup closing does not clear the new selection
    const previous = popupRef.current;
    popupRef.current = null;
    previous?.remove();
    if (!map || !lib || !focus) return;
    const dog = placed.find((d) => d.id === focus.id);
    if (!dog) return;
    const open = () => {
      const popup = new lib.Popup({ offset: 40, maxWidth: "280px", className: "dog-popup-wrap", focusAfterOpen: false })
        .setLngLat([dog.lng!, dog.lat!])
        .setDOMContent(popupContent(dog))
        .addTo(map);
      popup.on("close", () => {
        if (popupRef.current === popup) onSelectRef.current(null);
      });
      popupRef.current = popup;
    };
    if (focus.fly) {
      map.flyTo({ center: [dog.lng!, dog.lat!], zoom: Math.max(map.getZoom(), 13), duration: 1100, essential: true });
      map.once("moveend", open);
    } else open();
  }, [focus, placed, ready]);

  return <BaseMap onReady={onReady} zoomControl="bottom-left" className="!absolute inset-0" label="Map of fat dogs across India" />;
}
