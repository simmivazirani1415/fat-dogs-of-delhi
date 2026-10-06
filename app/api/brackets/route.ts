import { NextResponse, type NextRequest } from "next/server";
import { champion, isCompleteValid } from "@/lib/bracket";
import { findBracket } from "@/lib/predictions";
import { bracketStore, rateLimit } from "@/lib/submissions";
import { HANDLE_RE, cleanHandle } from "@/lib/uploadRules";

export const runtime = "nodejs";
const NOTE_MAX = 280;

const bad = (field: string, error: string, status = 400) => NextResponse.json({ ok: false, field, error }, { status });

/** GET /api/brackets?user=handle → that user's bracket (submitted here, or from the scraped board). */
export async function GET(req: NextRequest) {
  const user = cleanHandle(req.nextUrl.searchParams.get("user") ?? "").toLowerCase();
  if (!user) return bad("user", "Missing user");
  const found = await findBracket(user);
  return found ? NextResponse.json({ ok: true, bracket: found }) : bad("user", "No bracket for that username", 404);
}

/**
 * POST /api/brackets  { platform, handle, note?, picks[63], replace? }
 * One bracket per username: an existing one returns 409 unless `replace` is true.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const limit = rateLimit(`brackets:${ip}`, 5);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many brackets from here — try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: { platform?: string; handle?: string; note?: string; picks?: unknown; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return bad("form", "Couldn’t read the bracket. Please try again.");
  }

  const handle = cleanHandle(String(body.handle ?? ""));
  if (!handle) return bad("handle", "Add your Instagram or X username.");
  if (!HANDLE_RE.test(handle)) return bad("handle", "Usernames use letters, numbers, dots and underscores.");
  const note = String(body.note ?? "").trim();
  if (note.length > NOTE_MAX) return bad("note", `Keep it under ${NOTE_MAX} characters.`);
  if (!isCompleteValid(body.picks)) return bad("picks", "Pick all 63 matchups before submitting.");

  const handleKey = handle.toLowerCase();
  if (!body.replace && (await bracketStore.get(handleKey))) {
    return bad("handle", `@${handle} already has a bracket. Submitting again will replace it.`, 409);
  }

  const { saved, replaced } = await bracketStore.put({
    handle,
    handleKey,
    platform: body.platform === "x" ? "x" : "instagram",
    note,
    picks: body.picks,
    champion: champion(body.picks)!,
  });
  return NextResponse.json({ ok: true, handleKey: saved.handleKey, replaced }, { status: replaced ? 200 : 201 });
}
