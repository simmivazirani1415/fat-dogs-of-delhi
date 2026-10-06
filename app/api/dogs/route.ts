import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { rateLimit, submissionStore } from "@/lib/submissions";
import {
  AREA_MAX, HANDLE_RE, IMAGE_TYPES, NAME_MAX, cleanHandle, inRange, snapToGrid, validateMedia,
  type Platform, type Precision,
} from "@/lib/uploadRules";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};

const bad = (field: string, message: string, status = 400) =>
  NextResponse.json({ ok: false, field, error: message }, { status });

/** POST /api/dogs (multipart): media, name, area, platform?, handle?, lat, lng, precision. New dogs start "pending". */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const limit = rateLimit(`dogs:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "That’s a lot of fat dogs! Try again in a little while." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("form", "Couldn’t read the form. Please try again.");
  }

  const media = form.get("media");
  if (!(media instanceof File) || media.size === 0) return bad("media", "Choose a photo or video of the dog.");
  const mediaError = validateMedia(media.type, media.size);
  if (mediaError) return bad("media", mediaError);

  const name = String(form.get("name") ?? "").trim();
  const area = String(form.get("area") ?? "").trim();
  if (!name) return bad("name", "What’s their name?");
  if (name.length > NAME_MAX) return bad("name", `Keep the name under ${NAME_MAX} characters.`);
  if (!area) return bad("area", "Where do they live?");
  if (area.length > AREA_MAX) return bad("area", `Keep the area under ${AREA_MAX} characters.`);

  const platform = (form.get("platform") === "x" ? "x" : "instagram") as Platform;
  const handleRaw = cleanHandle(String(form.get("handle") ?? ""));
  if (handleRaw && !HANDLE_RE.test(handleRaw)) return bad("handle", "Usernames use letters, numbers, dots and underscores.");

  const precision: Precision = form.get("precision") === "exact" ? "exact" : "approximate";
  let lat = Number(form.get("lat"));
  let lng = Number(form.get("lng"));
  if (!inRange(lat, lng)) return bad("location", "Place the pin where you met this dog.");
  // never trust the client to blur the location
  if (precision === "approximate") ({ lat, lng } = snapToGrid(lat, lng));

  let bytes = Buffer.from(await media.arrayBuffer());
  if ((IMAGE_TYPES as readonly string[]).includes(media.type)) {
    try {
      // Re-encode: applies the EXIF orientation, then drops all metadata (incl. GPS) — sharp keeps none by default.
      const img = sharp(bytes, { failOn: "error" }).rotate();
      bytes =
        media.type === "image/png"
          ? await img.png().toBuffer()
          : media.type === "image/webp"
            ? await img.webp({ quality: 90 }).toBuffer()
            : await img.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    } catch {
      return bad("media", "That image looks damaged. Try another one.");
    }
  }

  const saved = await submissionStore.save(
    { name, area, platform: handleRaw ? platform : null, handle: handleRaw || null, lat, lng, precision, mediaType: media.type },
    { bytes, ext: EXT[media.type] },
  );

  return NextResponse.json({ ok: true, id: saved.id, status: saved.status }, { status: 201 });
}
