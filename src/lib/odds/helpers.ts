import type { Participant } from "@/data/sweepstake";
import { normaliseTeamName, ownerLookup } from "@/lib/football/ownerLabels";
import type { FixtureOddsDisplay } from "@/lib/odds/displayTypes";
import type {
  OddsEventSummary,
  OddsOutcome,
  OutrightOddsSummary,
} from "@/lib/odds/types";

export type AveragedOdds = {
  away?: number;
  draw?: number;
  home?: number;
};

export type TeamOddsCandidate = {
  fixture: string;
  owner: string;
  percentage: number;
  team: string;
};

export type OwnerNextMatchCandidate = {
  missingTeams: string[];
  owner: string;
  percentage: number;
  teams: Array<{
    percentage: number;
    team: string;
  }>;
};

export type OwnerOutrightCandidate = {
  owner: string;
  percentage: number;
  teams: Array<{
    percentage: number;
    team: string;
  }>;
};

export function decimalOddsToImpliedProbability(decimalOdds: number) {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    return 0;
  }

  return Math.round((100 / decimalOdds) * 10) / 10;
}

export function normalisedMatchupKey(home: string, away: string) {
  return [normaliseTeamName(home), normaliseTeamName(away)]
    .sort()
    .join("__");
}

export function findOwnerForTeamName(
  teamName: string,
  participants: Participant[],
) {
  return ownerLookup(participants).get(normaliseTeamName(teamName));
}

export function averageEventProbabilities(event: OddsEventSummary): AveragedOdds {
  const totals: Record<OddsOutcome["name"], number> = {
    away: 0,
    draw: 0,
    home: 0,
  };
  const counts: Record<OddsOutcome["name"], number> = {
    away: 0,
    draw: 0,
    home: 0,
  };

  for (const market of event.markets) {
    for (const outcome of market.outcomes) {
      totals[outcome.name] += outcome.impliedProbability;
      counts[outcome.name] += 1;
    }
  }

  return {
    away: counts.away > 0 ? Math.round((totals.away / counts.away) * 10) / 10 : undefined,
    draw: counts.draw > 0 ? Math.round((totals.draw / counts.draw) * 10) / 10 : undefined,
    home: counts.home > 0 ? Math.round((totals.home / counts.home) * 10) / 10 : undefined,
  };
}

function teamProbabilities(event: OddsEventSummary, odds: AveragedOdds) {
  return [
    odds.home === undefined
      ? undefined
      : {
          percentage: odds.home,
          side: "home" as const,
          team: event.home,
        },
    odds.away === undefined
      ? undefined
      : {
          percentage: odds.away,
          side: "away" as const,
          team: event.away,
        },
  ].filter((team): team is NonNullable<typeof team> => Boolean(team));
}

export function selectMarketFavourite(event: OddsEventSummary, odds: AveragedOdds) {
  return teamProbabilities(event, odds).sort(
    (a, b) => b.percentage - a.percentage,
  )[0];
}

export function selectUnderdog(event: OddsEventSummary, odds: AveragedOdds) {
  return teamProbabilities(event, odds).sort(
    (a, b) => a.percentage - b.percentage,
  )[0];
}

export function toFixtureOddsDisplay(
  event: OddsEventSummary,
): FixtureOddsDisplay | undefined {
  const odds = averageEventProbabilities(event);
  const favourite = selectMarketFavourite(event, odds);
  const underdog = selectUnderdog(event, odds);
  const probabilities: FixtureOddsDisplay["probabilities"] = [];

  if (odds.home !== undefined) {
    probabilities.push({
      label: event.home,
      percentage: odds.home,
      side: "home",
    });
  }

  if (odds.draw !== undefined) {
    probabilities.push({
      label: "Draw",
      percentage: odds.draw,
      side: "draw",
    });
  }

  if (odds.away !== undefined) {
    probabilities.push({
      label: event.away,
      percentage: odds.away,
      side: "away",
    });
  }

  if (probabilities.length === 0) {
    return undefined;
  }

  return {
    favourite: favourite?.team,
    probabilities,
    provider: "odds-api-io",
    underdog: underdog?.team,
  };
}

export function rankOwnersByAvailableOdds(
  events: OddsEventSummary[],
  participants: Participant[],
) {
  const ownerCandidates = new Map<string, TeamOddsCandidate>();

  for (const event of events) {
    const odds = averageEventProbabilities(event);

    for (const candidate of teamProbabilities(event, odds)) {
      const owner = findOwnerForTeamName(candidate.team, participants);
      const participant = participants.find(({ name }) => name === owner);
      const allocatedTeam = participant?.teams.find(
        (team) => normaliseTeamName(team.country) === normaliseTeamName(candidate.team),
      );

      if (!owner || allocatedTeam?.status !== "still-in") {
        continue;
      }

      const existing = ownerCandidates.get(owner);

      if (!existing || candidate.percentage > existing.percentage) {
        ownerCandidates.set(owner, {
          fixture: `${event.home} v ${event.away}`,
          owner,
          percentage: candidate.percentage,
          team: candidate.team,
        });
      }
    }
  }

  return Array.from(ownerCandidates.values()).sort(
    (a, b) => b.percentage - a.percentage || a.owner.localeCompare(b.owner, "en-GB"),
  );
}

export function rankOwnersByAvailableNextMatchOdds(
  events: OddsEventSummary[],
  participants: Participant[],
) {
  const availableOddsByTeam = new Map<string, number>();

  for (const event of events) {
    const odds = averageEventProbabilities(event);

    for (const candidate of teamProbabilities(event, odds)) {
      availableOddsByTeam.set(
        normaliseTeamName(candidate.team),
        candidate.percentage,
      );
    }
  }

  return participants
    .map<OwnerNextMatchCandidate>((participant) => {
      const remainingTeams = participant.teams.filter(
        (team) => team.status === "still-in",
      );
      const teams: OwnerNextMatchCandidate["teams"] = [];
      const missingTeams: string[] = [];

      for (const team of remainingTeams) {
        const percentage = availableOddsByTeam.get(normaliseTeamName(team.country));

        if (percentage === undefined) {
          missingTeams.push(team.country);
        } else {
          teams.push({
            percentage,
            team: team.country,
          });
        }
      }

      return {
        missingTeams,
        owner: participant.name,
        percentage:
          Math.round(
            teams.reduce((total, team) => total + team.percentage, 0) * 10,
          ) / 10,
        teams: teams.sort((a, b) => b.percentage - a.percentage),
      };
    })
    .filter(
      (candidate) =>
        candidate.teams.length > 0 || candidate.missingTeams.length > 0,
    )
    .sort(
      (a, b) =>
        b.percentage - a.percentage ||
        b.teams.length - a.teams.length ||
        a.owner.localeCompare(b.owner, "en-GB"),
    );
}

export function allTeamOddsCandidates(
  events: OddsEventSummary[],
  participants: Participant[],
) {
  return events.flatMap((event) => {
    const odds = averageEventProbabilities(event);

    return teamProbabilities(event, odds).flatMap((candidate) => {
      const owner = findOwnerForTeamName(candidate.team, participants);
      const participant = participants.find(({ name }) => name === owner);
      const allocatedTeam = participant?.teams.find(
        (team) => normaliseTeamName(team.country) === normaliseTeamName(candidate.team),
      );

      if (!owner || allocatedTeam?.status !== "still-in") {
        return [];
      }

      return [
        {
          fixture: `${event.home} v ${event.away}`,
          owner,
          percentage: candidate.percentage,
          team: candidate.team,
        },
      ];
    });
  });
}

export function rankOwnersByOutrightOdds(
  outrightOdds: OutrightOddsSummary[],
  participants: Participant[],
) {
  const byOwner = new Map<string, OwnerOutrightCandidate>();

  for (const odd of outrightOdds) {
    const owner = findOwnerForTeamName(odd.team, participants);
    const participant = participants.find(({ name }) => name === owner);
    const allocatedTeam = participant?.teams.find(
      (team) => normaliseTeamName(team.country) === normaliseTeamName(odd.team),
    );

    if (!owner || allocatedTeam?.status !== "still-in") {
      continue;
    }

    const existing = byOwner.get(owner) ?? {
      owner,
      percentage: 0,
      teams: [],
    };

    existing.percentage += odd.impliedProbability;
    existing.teams.push({
      percentage: odd.impliedProbability,
      team: allocatedTeam.country,
    });
    byOwner.set(owner, existing);
  }

  return Array.from(byOwner.values())
    .map((candidate) => ({
      ...candidate,
      percentage: Math.round(candidate.percentage * 10) / 10,
      teams: candidate.teams.sort((a, b) => b.percentage - a.percentage),
    }))
    .sort(
      (a, b) =>
        b.percentage - a.percentage || a.owner.localeCompare(b.owner, "en-GB"),
    );
}
