import { NextResponse } from "next/server";
import { loadOddsStatus } from "@/lib/odds/oddsStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public safe diagnostic for deployment checks. It never returns the API key,
// raw provider payloads, request URLs, or raw provider errors.
export async function GET() {
  const status = await loadOddsStatus();

  return NextResponse.json(status);
}
