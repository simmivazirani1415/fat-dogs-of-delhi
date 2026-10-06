// Upload rules shared by the Add-a-dog form (client) and POST /api/dogs (server).

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
export const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(",");

export const NAME_MAX = 40;
export const AREA_MAX = 80;
export const HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

export type Precision = "approximate" | "exact";
export type Platform = "instagram" | "x";

export function validateMedia(type: string, size: number): string | null {
  if ((IMAGE_TYPES as readonly string[]).includes(type)) {
    return size > MAX_IMAGE_BYTES ? "Photos can be up to 5 MB." : null;
  }
  if ((VIDEO_TYPES as readonly string[]).includes(type)) {
    return size > MAX_VIDEO_BYTES ? "Videos can be up to 15 MB." : null;
  }
  return "Choose a JPG, PNG or WebP photo, or an MP4, MOV or WebM video.";
}

export const cleanHandle = (h: string) => h.trim().replace(/^@+/, "");

/**
 * "Approximate area": snap to a ~1 km grid (0.01° latitude ≈ 1.1 km; longitude scaled by latitude),
 * so the stored point never reveals an exact address.
 */
export function snapToGrid(lat: number, lng: number) {
  const latStep = 0.009; // ≈ 1 km
  const lngStep = 0.009 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const r = (v: number, step: number) => Math.round(v / step) * step;
  return { lat: Number(r(lat, latStep).toFixed(5)), lng: Number(r(lng, lngStep).toFixed(5)) };
}

export const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
