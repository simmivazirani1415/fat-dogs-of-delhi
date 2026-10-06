import { NextResponse } from "next/server";
import { scoreBoard } from "@/lib/predictions";

export const dynamic = "force-static";

/** All ranked predictors (compact) for the Prediction leaderboard tab; fetched when the tab opens. */
export async function GET() {
  return NextResponse.json(await scoreBoard(), {
    headers: { "Cache-Control": "public, max-age=1800" },
  });
}
