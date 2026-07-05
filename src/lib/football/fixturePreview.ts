import type { Match, Participant, Team } from "@/data/sweepstake";
import { createOpenFootballAdapter } from "@/lib/football/adapters/openFootball";
import {
  normaliseTeamName,
  ownerLookup,
  possibleOwnerLabel,
} from "@/lib/football/ownerLabels";
import { resolveKnownKnockoutMatchups } from "@/lib/football/resolveKnockoutPlaceholders";
import type { FixtureOddsDisplay, OddsPreview } from "@/lib/odds/displayTypes";
import { normalisedMatchupKey } from "@/lib/odds/helpers";

export type FixturePreviewTeam = {
  flag?: string;
  name: string;
  owner?: string;
};

export type FixturePreviewItem = {
  away: FixturePreviewTeam;
  home: FixturePreviewTeam;
  id: string;
  kickoffLabel: string;
  odds?: FixtureOddsDisplay;
  roundId: Match["round"];
  scoreLabel: string;
  stageLabel: string;
  statusLabel: string;
  timestamp: number;
};

export type FixturePreviewRoundGroup = {
  completed: FixturePreviewItem[];
  id: Match["round"];
  remaining: FixturePreviewItem[];
  title: string;
};

export type FixturesPreview = {
  roundGroups: FixturePreviewRoundGroup[];
};

const knockoutRoundOrder: Match["round"][] = [
  "round-of-32",
  "round-of-16",
  "quarter-finals",
  "semi-finals",
  "final",
  "third-place",
];

function teamName(
  teamId: string | null,
  placeholder: string | undefined,
  teamsById: Map<string, Team>,
) {
  if (!teamId) {
    return placeholder ?? "Team TBC";
  }

  return teamsById.get(teamId)?.country ?? placeholder ?? "Team TBC";
}

function flagLookup(participants: Participant[]) {
  const lookup = new Map<string, string>();

  for (const participant of participants) {
    for (const team of participant.teams) {
      lookup.set(normaliseTeamName(team.country), team.flag);
    }
  }

  return lookup;
}

function stageLabel(match: Match) {
  const labels: Record<Match["round"], string> = {
    "group-stage": "Group stage",
    "quarter-finals": "Quarter-finals",
    "round-of-16": "Round of 16",
    "round-of-32": "Round of 32",
    "semi-finals": "Semi-finals",
    final: "Final",
    "third-place": "Third-place match",
  };

  return labels[match.round];
}

function statusLabel(match: Match) {
  const labels: Record<Match["status"], string> = {
    finished: "Finished",
    live: "Live",
    postponed: "TBD",
    scheduled: "Scheduled",
  };

  return labels[match.status];
}

function scoreLabel(match: Match) {
  if (match.homeScore === null || match.awayScore === null) {
    return "v";
  }

  return `${match.homeScore}-${match.awayScore}`;
}

function kickoffDate(match: Match) {
  if (!match.kickoffAt) {
    return null;
  }

  const parsedDate = new Date(match.kickoffAt);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function kickoffLabel(match: Match) {
  const parsedDate = kickoffDate(match);

  if (!parsedDate) {
    return "Date and time TBC";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(parsedDate);
}

function sameUkDay(a: Date, b: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/London",
    year: "numeric",
  });

  return formatter.format(a) === formatter.format(b);
}

function toPreviewItem(
  match: Match,
  participants: Participant[],
  teamsById: Map<string, Team>,
  ownersByTeamName: Map<string, string>,
  oddsPreview?: OddsPreview,
): FixturePreviewItem {
  const homeName = teamName(match.homeTeamId, match.homeTeamPlaceholder, teamsById);
  const awayName = teamName(match.awayTeamId, match.awayTeamPlaceholder, teamsById);
  const parsedDate = kickoffDate(match);
  const flagsByTeamName = flagLookup(participants);

  return {
    away: {
      flag: flagsByTeamName.get(normaliseTeamName(awayName)),
      name: awayName,
      owner:
        ownersByTeamName.get(normaliseTeamName(awayName)) ??
        possibleOwnerLabel(awayName, participants),
    },
    home: {
      flag: flagsByTeamName.get(normaliseTeamName(homeName)),
      name: homeName,
      owner:
        ownersByTeamName.get(normaliseTeamName(homeName)) ??
        possibleOwnerLabel(homeName, participants),
    },
    id: match.id,
    kickoffLabel: kickoffLabel(match),
    odds: oddsPreview?.fixtureOddsByMatchup[
      normalisedMatchupKey(homeName, awayName)
    ],
    roundId: match.round,
    scoreLabel: scoreLabel(match),
    stageLabel: stageLabel(match),
    statusLabel: statusLabel(match),
    timestamp: parsedDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
  };
}

export async function loadOpenFootballFixturesPreview(
  participants: Participant[],
  now = new Date(),
  oddsPreview?: OddsPreview,
): Promise<FixturesPreview> {
  const result = await createOpenFootballAdapter().fetchWorldCupFixtures({
    season: 2026,
  });
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const ownersByTeamName = ownerLookup(participants);
  const knockoutMatches = result.matches.filter(
    (match) => match.round !== "group-stage",
  );
  const fixtures = resolveKnownKnockoutMatchups(knockoutMatches, result.teams)
    .map((match) =>
      toPreviewItem(
        match,
        participants,
        teamsById,
        ownersByTeamName,
        oddsPreview,
      ),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  const remainingPriority = (fixture: FixturePreviewItem) => {
    if (fixture.statusLabel === "Live") {
      return 0;
    }

    if (
      Number.isFinite(fixture.timestamp) &&
      sameUkDay(new Date(fixture.timestamp), now)
    ) {
      return 1;
    }

    return 2;
  };
  const roundGroups = knockoutRoundOrder
    .map((roundId) => {
      const roundFixtures = fixtures.filter((fixture) => fixture.roundId === roundId);
      const remaining = roundFixtures
        .filter((fixture) => fixture.statusLabel !== "Finished")
        .sort(
          (a, b) =>
            remainingPriority(a) - remainingPriority(b) ||
            a.timestamp - b.timestamp,
        );
      const completed = roundFixtures
        .filter((fixture) => fixture.statusLabel === "Finished")
        .sort((a, b) => b.timestamp - a.timestamp);

      return {
        completed,
        id: roundId,
        remaining,
        title: stageLabel({ round: roundId } as Match),
      };
    })
    .filter(
      (group) => group.remaining.length > 0 || group.completed.length > 0,
    )
    .sort(
      (a, b) =>
        Number(b.remaining.length > 0) - Number(a.remaining.length > 0) ||
        knockoutRoundOrder.indexOf(a.id) - knockoutRoundOrder.indexOf(b.id),
    );

  return {
    roundGroups,
  };
}
