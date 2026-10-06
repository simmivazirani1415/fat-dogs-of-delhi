import { NextResponse, type NextRequest } from "next/server";
import { PAGE_SIZE, predictionsPage, searchPredictions } from "@/lib/predictions";

/** GET /api/predictions?offset=24 → next page of cards; ?q=handle → search. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q");
  if (q !== null) {
    return NextResponse.json({ items: await searchPredictions(q.slice(0, 40)) });
  }
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const limit = Math.min(48, Math.max(1, Number(params.get("limit")) || PAGE_SIZE));
  // not cached: brackets submitted on this site appear immediately
  return NextResponse.json(await predictionsPage(offset, limit));
}
