import { NextResponse, type NextRequest } from "next/server";
import type { Match, Team, TournamentStage } from "@/data/sweepstake";
import { createOpenFootballAdapter } from "@/lib/football/adapters/openFootball";
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

function teamName(teamId: string | null, teamsById: Map<string, Team>) {
  if (!teamId) {
    return undefined;
  }

  return teamsById.get(teamId)?.country;
}

function fixtureName(match: Match, teamsById: Map<string, Team>) {
  return {
    away:
      teamName(match.awayTeamId, teamsById) ??
      match.awayTeamPlaceholder ??
      "Team TBC",
    home:
      teamName(match.homeTeamId, teamsById) ??
      match.homeTeamPlaceholder ??
      "Team TBC",
    kickoffAt: match.kickoffAt,
    round: match.round,
  };
}

// Local preview only. OpenFootball is a free static JSON source, not a
// guaranteed live feed; manual override or another provider can be added later
// for live result correction.
export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "OpenFootball preview is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const adapter = createOpenFootballAdapter();

  try {
    const result = await adapter.fetchWorldCupFixtures({ season: 2026 });
    const teamsById = new Map(result.teams.map((team) => [team.id, team]));
    const stages = Array.from(
      result.matches.reduce<Set<TournamentStage>>((foundStages, match) => {
        foundStages.add(match.round);
        return foundStages;
      }, new Set()),
    );
    const hasScores = result.matches.some(
      (match) => match.homeScore !== null || match.awayScore !== null,
    );

    return NextResponse.json({
      fetchedAt: result.fetchedAt,
      firstFixtures: result.matches
        .slice(0, 5)
        .map((match) => fixtureName(match, teamsById)),
      hasScores,
      ok: true,
      provider: result.provider,
      sourceName: result.sourceName,
      stages,
      totalMatchCount: result.matches.length,
      tournamentName: result.tournamentName,
      writeMode: "read-only static preview",
    });
  } catch (error) {
    if (error instanceof FootballAdapterError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.message,
          ok: false,
          provider: "openfootball",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        code: "unexpected-response",
        error: "OpenFootball preview failed unexpectedly.",
        ok: false,
        provider: "openfootball",
      },
      { status: 500 },
    );
  }
}
