import { NextResponse, type NextRequest } from "next/server";
import { createApiFootballAdapter } from "@/lib/football/adapters/apiFootball";
import { FootballAdapterError } from "@/lib/football/types";

export const dynamic = "force-dynamic";

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

function numericEnv(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

// Local manual sync preview only. This route proves the adapter can fetch and
// map fixtures, but it does not overwrite the local sample bracket or UI data.
export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "Football sync preview is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const adapter = createApiFootballAdapter();
  const leagueId = numericEnv("API_FOOTBALL_WORLD_CUP_LEAGUE_ID", 1);
  const season = numericEnv("API_FOOTBALL_WORLD_CUP_SEASON", 2026);

  try {
    const result = await adapter.fetchWorldCupFixtures({ leagueId, season });

    return NextResponse.json({
      fetchedAt: result.fetchedAt,
      matchCount: result.matches.length,
      ok: true,
      provider: result.provider,
      sampleMatches: result.matches.slice(0, 5).map((match) => ({
        awayTeamId: match.awayTeamId,
        homeTeamId: match.homeTeamId,
        id: match.id,
        kickoffAt: match.kickoffAt,
        round: match.round,
        status: match.status,
      })),
      sourceFixtureCount: result.sourceFixtureCount,
      teamCount: result.teams.length,
      writeMode: "read-only preview",
    });
  } catch (error) {
    if (error instanceof FootballAdapterError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.message,
          ok: false,
        },
        { status: error.code === "missing-api-key" ? 400 : 502 },
      );
    }

    return NextResponse.json(
      {
        code: "unexpected-response",
        error: "Football sync preview failed unexpectedly.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
