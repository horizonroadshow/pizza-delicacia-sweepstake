import { NextResponse, type NextRequest } from "next/server";
import { createParticipants } from "@/data/sweepstake";
import { sweepstakeConfigs } from "@/data/sweepstakes";
import { loadOpenFootballLeaderboardParticipants } from "@/lib/football/leaderboardStatus";
import { normaliseTeamName } from "@/lib/football/ownerLabels";
import { rankOwnersByOutrightOdds } from "@/lib/odds/helpers";
import {
  loadOutrightOddsForDisplay,
  savedWorldCupOutrightSnapshot,
} from "@/lib/odds/oddsPreview";

export const dynamic = "force-dynamic";

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

function percentageByTeam(
  odds: Awaited<ReturnType<typeof loadOutrightOddsForDisplay>>["odds"],
) {
  return Object.fromEntries(
    odds.map((odd) => [
      normaliseTeamName(odd.team),
      {
        probability: odd.impliedProbability,
        team: odd.team,
      },
    ]),
  );
}

function sameProbability(
  expected: number | undefined,
  actual: number | undefined,
) {
  return (
    typeof expected === "number" &&
    typeof actual === "number" &&
    Math.abs(expected - actual) < 0.01
  );
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "Odds consistency validation is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const results = await Promise.all(
    sweepstakeConfigs.map(async (config) => {
      const participants = await loadOpenFootballLeaderboardParticipants(
        createParticipants(config),
      );
      const outright = await loadOutrightOddsForDisplay(participants);
      const ownerRankings = rankOwnersByOutrightOdds(
        outright.odds,
        participants,
      );

      return {
        ownerRankings: ownerRankings.slice(0, 5).map((ranking) => ({
          owner: ranking.owner,
          percentage: ranking.percentage,
          teams: ranking.teams,
        })),
        slug: config.slug,
        source: outright.state,
        teamProbabilities: percentageByTeam(outright.odds),
      };
    }),
  );
  const [baseline] = results;
  const teamKeys = Object.keys(baseline?.teamProbabilities ?? {}).sort();
  const mismatches = results.flatMap((result) =>
    teamKeys.flatMap((teamKey) => {
      const baselineProbability =
        baseline?.teamProbabilities[teamKey]?.probability;
      const actualProbability = result.teamProbabilities[teamKey]?.probability;

      if (sameProbability(baselineProbability, actualProbability)) {
        return [];
      }

      return [
        {
          baseline: baseline?.slug,
          baselineProbability,
          compared: result.slug,
          comparedProbability: actualProbability,
          team: baseline?.teamProbabilities[teamKey]?.team ?? teamKey,
        },
      ];
    }),
  );
  const participantNames = new Set(
    sweepstakeConfigs.flatMap((config) =>
      config.participants.map((participant) => participant.name),
    ),
  );
  const savedFallbackOwnerLeaks = savedWorldCupOutrightSnapshot()
    .map((snapshot) => snapshot.team)
    .filter((team) => participantNames.has(team));

  return NextResponse.json({
    checkedTeams: teamKeys.map(
      (teamKey) => baseline?.teamProbabilities[teamKey]?.team ?? teamKey,
    ),
    comparisons: results,
    environment: {
      hasOddsApiIoKey: Boolean(process.env.ODDS_API_IO_KEY),
      hasTheOddsApiKey: Boolean(process.env.THE_ODDS_API_KEY),
      rootSweepstakeSlug:
        process.env.NEXT_PUBLIC_SWEEPSTAKE_SLUG ?? "pizza-delicacia-default",
    },
    mismatches,
    ok: mismatches.length === 0 && savedFallbackOwnerLeaks.length === 0,
    savedFallbackOwnerLeaks,
  });
}
