import { NextRequest, NextResponse } from "next/server";
import { loadOddsStatus } from "@/lib/odds/oddsStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public safe diagnostic for deployment checks. It never returns the API key,
// raw provider payloads, request URLs, or raw provider errors.
export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  const status = await loadOddsStatus({ refresh });

  return NextResponse.json(status);
}
