import { NextResponse, type NextRequest } from "next/server";
import { createFootballDataOrgAdapter } from "@/lib/football/adapters/footballDataOrg";
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

// Local discovery only. This proves whether football-data.org can read World
// Cup fixtures, but it never writes over local sample data or page state.
export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "football-data.org discovery is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const adapter = createFootballDataOrgAdapter();
  const competitionCode =
    process.env.FOOTBALL_DATA_WORLD_CUP_COMPETITION_CODE ?? "WC";
  const season = numericEnv("FOOTBALL_DATA_WORLD_CUP_SEASON", 2026);

  try {
    const result = await adapter.fetchWorldCupFixtures({
      competitionCode,
      season,
    });

    return NextResponse.json({
      competitionCode,
      fetchedAt: result.fetchedAt,
      fixtureCount: result.matches.length,
      ok: true,
      provider: result.provider,
      season,
      sampleFixtures: result.matches.slice(0, 5).map((match) => ({
        awayTeamId: match.awayTeamId,
        homeTeamId: match.homeTeamId,
        id: match.id,
        kickoffAt: match.kickoffAt,
        round: match.round,
        status: match.status,
      })),
      sourceFixtureCount: result.sourceFixtureCount,
      teamCount: result.teams.length,
      writeMode: "read-only discovery",
    });
  } catch (error) {
    if (error instanceof FootballAdapterError) {
      return NextResponse.json(
        {
          code: error.code,
          competitionCode,
          error: error.message,
          ok: false,
          provider: "football-data",
          season,
        },
        { status: error.code === "missing-api-key" ? 400 : 502 },
      );
    }

    return NextResponse.json(
      {
        code: "unexpected-response",
        competitionCode,
        error: "football-data.org discovery failed unexpectedly.",
        ok: false,
        provider: "football-data",
        season,
      },
      { status: 500 },
    );
  }
}
