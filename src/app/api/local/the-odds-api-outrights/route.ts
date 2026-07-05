import { NextResponse, type NextRequest } from "next/server";
import { createParticipants } from "@/data/sweepstake";
import { activeSweepstakeConfig } from "@/data/sweepstakes";
import { loadOpenFootballLeaderboardParticipants } from "@/lib/football/leaderboardStatus";
import { createTheOddsApiAdapter } from "@/lib/odds/adapters/theOddsApi";
import { OddsAdapterError } from "@/lib/odds/types";

export const dynamic = "force-dynamic";

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

// Local discovery only. This checks The Odds API free-plan outrights endpoint
// and never writes data into Bookies' Corner, fixtures, or the leaderboard.
export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "The Odds API outright discovery is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  try {
    const participants = await loadOpenFootballLeaderboardParticipants(
      createParticipants(activeSweepstakeConfig),
    );
    const result = await createTheOddsApiAdapter({
      participants,
    }).discoverWorldCupWinnerOutrights();

    return NextResponse.json({
      bookmakerCount: result.bookmakerCount,
      currentRemainingTeamsFound: result.currentRemainingTeamsFound,
      fetchedAt: result.fetchedAt,
      firstOutcomes: result.firstOutcomes.map((outcome) => ({
        averageDecimalOdds: outcome.averageDecimalOdds,
        bestDecimalOdds: outcome.bestDecimalOdds,
        bookmakerCount: outcome.bookmakerCount,
        medianDecimalOdds: outcome.medianDecimalOdds,
        matchedInternalTeam: outcome.matchedInternalTeam,
        normalisedImpliedProbability: `${outcome.normalisedImpliedProbability}%`,
        owner: outcome.owner,
        rawImpliedProbability: `${outcome.rawImpliedProbability}%`,
        team: outcome.team,
      })),
      market: result.market,
      ok: true,
      outcomeCount: result.outcomeCount,
      provider: result.provider,
      qualityDiagnostics: result.qualityDiagnostics.map((diagnostic) => ({
        averageDecimalOdds: diagnostic.averageDecimalOdds,
        bookmakerCount: diagnostic.bookmakerCount,
        normalisedImpliedProbability: `${diagnostic.normalisedImpliedProbability}%`,
        rawImpliedProbability: `${diagnostic.rawImpliedProbability}%`,
        team: diagnostic.team,
        unusuallyHigh: diagnostic.unusuallyHigh,
      })),
      requestCount: result.requestCount,
      sportKey: result.sportKey,
      usefulForBranchChance:
        result.householdChancePossible && result.matchedRemainingTeams.length > 0,
      usefulForHouseholdChance:
        result.householdChancePossible && result.matchedRemainingTeams.length > 0,
      usefulForOwnerChance:
        result.ownerChancePossible && result.matchedRemainingTeams.length > 0,
      usefulForStrongestRemainingTeam: result.strongestRemainingTeamPossible,
      unmatchedRemainingTeams: result.unmatchedRemainingTeams,
      writeMode: "read-only The Odds API outright discovery",
    });
  } catch (error) {
    if (error instanceof OddsAdapterError) {
      return NextResponse.json(
        {
          code: error.code,
          error:
            error.code === "missing-api-key"
              ? "THE_ODDS_API_KEY is missing or rejected."
              : "The Odds API outright discovery failed safely.",
          ok: false,
          provider: "the-odds-api",
        },
        { status: error.code === "missing-api-key" ? 400 : 502 },
      );
    }

    return NextResponse.json(
      {
        code: "unexpected-response",
        error: "The Odds API outright discovery failed unexpectedly.",
        ok: false,
        provider: "the-odds-api",
      },
      { status: 500 },
    );
  }
}
