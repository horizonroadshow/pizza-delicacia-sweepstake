import { NextResponse, type NextRequest } from "next/server";
import { createOpenFootballAdapter } from "@/lib/football/adapters/openFootball";
import {
  resolveKnownKnockoutMatchups,
  validateWorldCup2026KnockoutProgression,
} from "@/lib/football/resolveKnockoutPlaceholders";

export const dynamic = "force-dynamic";

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

function numberFromMatchId(matchId: string) {
  return /\d+$/.exec(matchId)?.[0] ?? matchId;
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "Bracket progression validation is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const result = await createOpenFootballAdapter().fetchWorldCupFixtures({
    season: 2026,
  });
  const knockoutMatches = result.matches.filter(
    (match) => match.round !== "group-stage",
  );
  const resolvedMatches = resolveKnownKnockoutMatchups(
    knockoutMatches,
    result.teams,
  );
  const validation = validateWorldCup2026KnockoutProgression(resolvedMatches);
  const qfAndSemiMappings = resolvedMatches
    .filter((match) =>
      [
        "quarter-finals",
        "semi-finals",
      ].includes(match.round),
    )
    .map((match) => ({
      loserTarget: match.loserNextMatchId
        ? numberFromMatchId(match.loserNextMatchId)
        : null,
      match: numberFromMatchId(match.id),
      round: match.round,
      winnerTarget: match.nextMatchId
        ? numberFromMatchId(match.nextMatchId)
        : null,
      winnerTargetSlot: match.nextMatchSlot,
    }));

  return NextResponse.json({
    ...validation,
    mappings: qfAndSemiMappings,
    sourceName: result.sourceName,
  });
}
