import { NextResponse, type NextRequest } from "next/server";
import { submissionStore } from "@/lib/submissions";

/** GET /api/dogs/status?q=FD-XXXXXX | dog name | @handle → pending / approved / rejected */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  const found = await submissionStore.find(q);
  return NextResponse.json({
    results: found.slice(0, 10).map(({ id, name, area, status, createdAt }) => ({ id, name, area, status, createdAt })),
  });
}
