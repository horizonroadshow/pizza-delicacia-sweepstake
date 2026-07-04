import type { Match, Participant, Team } from "@/data/sweepstake";
import { createOpenFootballAdapter } from "@/lib/football/adapters/openFootball";

export type FixturePreviewTeam = {
  name: string;
  owner?: string;
};

export type FixturePreviewItem = {
  away: FixturePreviewTeam;
  home: FixturePreviewTeam;
  id: string;
  kickoffLabel: string;
  scoreLabel: string;
  stageLabel: string;
  statusLabel: string;
  timestamp: number;
};

export type FixturesPreview = {
  recent: FixturePreviewItem[];
  today: FixturePreviewItem[];
  upcoming: FixturePreviewItem[];
};

const teamNameAliases: Record<string, string> = {
  "czech republic": "czechia",
  "ir iran": "iran",
  "korea republic": "south korea",
  usa: "united states",
};

function normaliseName(name: string) {
  const normalisedName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return teamNameAliases[normalisedName] ?? normalisedName;
}

function ownerLookup(participants: Participant[]) {
  const lookup = new Map<string, string>();

  for (const participant of participants) {
    for (const team of participant.teams) {
      lookup.set(normaliseName(team.country), participant.name);
    }
  }

  return lookup;
}

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
  teamsById: Map<string, Team>,
  ownersByTeamName: Map<string, string>,
): FixturePreviewItem {
  const homeName = teamName(match.homeTeamId, match.homeTeamPlaceholder, teamsById);
  const awayName = teamName(match.awayTeamId, match.awayTeamPlaceholder, teamsById);
  const parsedDate = kickoffDate(match);

  return {
    away: {
      name: awayName,
      owner: ownersByTeamName.get(normaliseName(awayName)),
    },
    home: {
      name: homeName,
      owner: ownersByTeamName.get(normaliseName(homeName)),
    },
    id: match.id,
    kickoffLabel: kickoffLabel(match),
    scoreLabel: scoreLabel(match),
    stageLabel: stageLabel(match),
    statusLabel: statusLabel(match),
    timestamp: parsedDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
  };
}

export async function loadOpenFootballFixturesPreview(
  participants: Participant[],
  now = new Date(),
): Promise<FixturesPreview> {
  const result = await createOpenFootballAdapter().fetchWorldCupFixtures({
    season: 2026,
  });
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const ownersByTeamName = ownerLookup(participants);
  const fixtures = result.matches
    .map((match) => toPreviewItem(match, teamsById, ownersByTeamName))
    .sort((a, b) => a.timestamp - b.timestamp);
  const today = fixtures.filter((fixture) =>
    Number.isFinite(fixture.timestamp) &&
    sameUkDay(new Date(fixture.timestamp), now),
  );
  const recent = fixtures
    .filter(
      (fixture) =>
        fixture.statusLabel === "Finished" && fixture.timestamp <= now.getTime(),
    )
    .slice(-4)
    .reverse();
  const upcoming = fixtures
    .filter((fixture) => fixture.timestamp > now.getTime())
    .slice(0, 4);

  return {
    recent,
    today,
    upcoming,
  };
}
