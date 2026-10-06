// Server-only: one list of map dogs = the 64 tournament dogs (placed by area, data/area-coords.json)
// followed by the community uploads from the map endpoint (data/map-dogs.json), newest first.
import { leaderboard, loadAreaCoords, loadMapPins } from "@/lib/data";
import { dogs } from "@/lib/dogs";

export type MapDog = {
  id: string;
  kind: "tournament" | "upload";
  name: string;
  place: string;
  lat: number | null;
  lng: number | null;
  photo: string | null; // local image (tournament photo or upload thumbnail)
  mediaUrl: string | null; // full upload (image or video) on the source site
  mediaType: string;
  platform: "instagram" | "x" | null;
  handle: string | null;
  profileUrl: string | null;
  rank: number | null; // leaderboard rank (tournament) — ties preserved
  picks: number | null;
  createdAt: string | null;
};

/** Small deterministic offset so dogs sharing an area don't stack on one point (≈ ±300 m). */
function jitter(id: string, i: number) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const a = ((h >>> 0) % 360) * (Math.PI / 180);
  const r = 0.0012 + (i % 3) * 0.0009;
  return { dLat: Math.sin(a) * r, dLng: Math.cos(a) * r };
}

export async function mapDogs(): Promise<{ items: MapDog[]; uploadsTotal: number }> {
  const [coords, uploads] = await Promise.all([loadAreaCoords(), loadMapPins()]);
  const rankOf = new Map(leaderboard.rows.map((r) => [r.dogId, r]));

  const seenArea = new Map<string, number>();
  const tournament: MapDog[] = dogs
    .map((d) => {
      const c = coords[d.area];
      const n = seenArea.get(d.area) ?? 0;
      seenArea.set(d.area, n + 1);
      const j = jitter(d.id, n);
      const row = rankOf.get(d.id);
      return {
        id: d.id,
        kind: "tournament" as const,
        name: d.name,
        place: d.area,
        lat: c ? Number((c.lat + (n ? j.dLat : 0)).toFixed(5)) : null,
        lng: c ? Number((c.lng + (n ? j.dLng : 0)).toFixed(5)) : null,
        photo: d.image,
        mediaUrl: null,
        mediaType: "image/jpeg",
        platform: null,
        handle: null,
        profileUrl: null,
        rank: row?.rank ?? null,
        picks: row?.picks ?? null,
        createdAt: null,
      };
    })
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const community: MapDog[] = [...uploads.pins]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      id: p.id,
      kind: "upload" as const,
      name: p.name,
      place: p.place,
      lat: p.lat,
      lng: p.lng,
      photo: p.thumb,
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      platform: p.platform,
      handle: p.handle,
      profileUrl: p.profileUrl,
      rank: null,
      picks: null,
      createdAt: p.createdAt,
    }));

  return { items: [...tournament, ...community], uploadsTotal: uploads.totalDogs };
}
