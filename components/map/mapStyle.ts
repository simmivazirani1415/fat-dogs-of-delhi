import type { Map as MLMap } from "maplibre-gl";

/** OpenFreeMap vector style; tinted to the cream palette once loaded. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const INDIA_VIEW = { center: [80.5, 22.6] as [number, number], zoom: 3.5 };
export const INDIA_BOUNDS: [[number, number], [number, number]] = [[68.5, 7.5], [97.5, 33.5]];
export const DELHI_VIEW = { center: [77.209, 28.6139] as [number, number], zoom: 9.6 };
export const DELHI_BOUNDS: [[number, number], [number, number]] = [[76.84, 28.4], [77.55, 28.88]];

const LAND = "#F3EBD9";
const WATER = "#9FD3F2";
const WATER_LABEL = "#2C78B5";
const LABEL = "#6B5547";
const HALO = "#FBF6EF";

const set = (map: MLMap, id: string, prop: string, value: string | number) => {
  try {
    (map.setPaintProperty as (id: string, prop: string, value: string | number) => void).call(map, id, prop, value);
  } catch {
    /* property not valid for this layer type */
  }
};

export function tintMap(map: MLMap) {
  for (const layer of map.getStyle().layers ?? []) {
    const { id, type } = layer;
    if (type === "background") set(map, id, "background-color", LAND);
    else if (type === "fill" && id === "water") set(map, id, "fill-color", WATER);
    else if (type === "line" && id.startsWith("waterway")) set(map, id, "line-color", WATER);
    else if (type === "fill" && /park|wood|landuse|landcover/.test(id)) {
      set(map, id, "fill-color", "#EAE0C6");
      set(map, id, "fill-opacity", 0.55);
    } else if (type === "fill" && id === "building") set(map, id, "fill-color", "#E9DFCC");
    else if (type === "line" && id.startsWith("boundary")) set(map, id, "line-color", "#C4B094");
    else if (type === "line" && /highway|railway|road/.test(id)) set(map, id, "line-color", "#FFFFFF");
    else if (type === "symbol") {
      const water = id.startsWith("water");
      set(map, id, "text-color", water ? WATER_LABEL : LABEL);
      set(map, id, "text-halo-color", water ? "rgba(159,211,242,0.6)" : HALO);
      // English names only (the base style stacks Latin + local script)
      if (/^(label_|water_name|waterway_line_label)/.test(id)) {
        try {
          map.setLayoutProperty(id, "text-field", ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]);
        } catch {
          /* ignore */
        }
      }
      if (water) {
        try {
          map.setLayoutProperty(id, "text-letter-spacing", 0.3);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

/** A ~1 km circle polygon (GeoJSON) around a point, for the "approximate area" overlay. */
export function circlePolygon(lng: number, lat: number, radiusM = 1000, steps = 64) {
  const coords: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}
