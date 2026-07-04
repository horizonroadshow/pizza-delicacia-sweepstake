import type {
  Match,
  MatchStatus,
  Team,
  TeamId,
  TournamentStage,
} from "@/data/sweepstake";
import {
  FootballAdapterError,
  type FetchWorldCupFixturesInput,
  type FootballFixtureSyncResult,
} from "@/lib/football/types";

export const OPENFOOTBALL_WORLD_CUP_2026_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

type OpenFootballScore = {
  ft?: [number | null, number | null];
};

type OpenFootballMatch = {
  date?: string;
  group?: string;
  num?: number;
  round?: string;
  score?: OpenFootballScore;
  team1?: string;
  team2?: string;
  time?: string;
};

type OpenFootballWorldCup = {
  matches?: unknown;
  name?: string;
};

export type OpenFootballFixtureSyncResult = FootballFixtureSyncResult & {
  sourceName: string;
  tournamentName: string;
};

function slug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isPlaceholderTeam(teamName: string | undefined) {
  if (!teamName) {
    return true;
  }

  const normalisedName = teamName.trim().toUpperCase();

  return (
    normalisedName === "TBD" ||
    normalisedName === "TBA" ||
    /^[WL]\d+$/.test(normalisedName)
  );
}

function toTeam(teamName: string | undefined): Team | undefined {
  if (isPlaceholderTeam(teamName) || !teamName) {
    return undefined;
  }

  return {
    country: teamName,
    flag: "◇",
    id: `openfootball-${slug(teamName)}`,
  };
}

function toTournamentStage(match: OpenFootballMatch): TournamentStage {
  const round = match.round?.toLowerCase() ?? "";

  if (round.includes("round of 32")) {
    return "round-of-32";
  }

  if (round.includes("round of 16")) {
    return "round-of-16";
  }

  if (round.includes("quarter")) {
    return "quarter-finals";
  }

  if (round.includes("semi")) {
    return "semi-finals";
  }

  if (round.includes("third")) {
    return "third-place";
  }

  if (round.includes("final")) {
    return "final";
  }

  return "group-stage";
}

function kickoffAt(match: OpenFootballMatch) {
  if (!match.date) {
    return null;
  }

  if (!match.time) {
    return match.date;
  }

  const timeMatch = match.time.match(
    /^(\d{1,2}):(\d{2})\s+UTC([+-])(\d{1,2})$/i,
  );

  if (!timeMatch) {
    return `${match.date} ${match.time}`;
  }

  const [, hour, minute, sign, offsetHour] = timeMatch;

  return `${match.date}T${hour.padStart(2, "0")}:${minute}:00${sign}${offsetHour.padStart(2, "0")}:00`;
}

function scoreAt(match: OpenFootballMatch, index: 0 | 1) {
  return match.score?.ft?.[index] ?? null;
}

function status(match: OpenFootballMatch): MatchStatus {
  return match.score?.ft ? "finished" : "scheduled";
}

function winnerTeamId(match: OpenFootballMatch): TeamId | null {
  const homeScore = scoreAt(match, 0);
  const awayScore = scoreAt(match, 1);

  if (homeScore === null || awayScore === null || homeScore === awayScore) {
    return null;
  }

  const winningTeam = homeScore > awayScore ? toTeam(match.team1) : toTeam(match.team2);

  return winningTeam?.id ?? null;
}

export function mapOpenFootballMatchToMatch(
  match: OpenFootballMatch,
  index: number,
): Match {
  const homeTeam = toTeam(match.team1);
  const awayTeam = toTeam(match.team2);
  const matchNumber = match.num ?? index + 1;

  return {
    awayScore: scoreAt(match, 1),
    awayTeamId: awayTeam?.id ?? null,
    awayTeamPlaceholder: awayTeam ? undefined : match.team2 ?? "Team TBC",
    homeScore: scoreAt(match, 0),
    homeTeamId: homeTeam?.id ?? null,
    homeTeamPlaceholder: homeTeam ? undefined : match.team1 ?? "Team TBC",
    id: `openfootball-2026-match-${matchNumber}`,
    kickoffAt: kickoffAt(match),
    nextMatchId: null,
    nextMatchSlot: null,
    round: toTournamentStage(match),
    status: status(match),
    winnerTeamId: winnerTeamId(match),
  };
}

function isOpenFootballMatchArray(
  matches: unknown,
): matches is OpenFootballMatch[] {
  return Array.isArray(matches);
}

function uniqueTeams(matches: OpenFootballMatch[]) {
  const teams = new Map<TeamId, Team>();

  for (const match of matches) {
    const homeTeam = toTeam(match.team1);
    const awayTeam = toTeam(match.team2);

    if (homeTeam) {
      teams.set(homeTeam.id, homeTeam);
    }

    if (awayTeam) {
      teams.set(awayTeam.id, awayTeam);
    }
  }

  return Array.from(teams.values());
}

export function createOpenFootballAdapter() {
  return {
    provider: "openfootball",
    async fetchWorldCupFixtures(
      input: FetchWorldCupFixturesInput,
    ): Promise<OpenFootballFixtureSyncResult> {
      const sourceUrl = input.sourceUrl ?? OPENFOOTBALL_WORLD_CUP_2026_URL;

      let response: Response;

      try {
        response = await fetch(sourceUrl);
      } catch {
        throw new FootballAdapterError(
          "Could not reach OpenFootball's static World Cup JSON file.",
          "network-failure",
        );
      }

      if (!response.ok) {
        throw new FootballAdapterError(
          `OpenFootball returned HTTP ${response.status}.`,
          "network-failure",
        );
      }

      const body = (await response.json()) as OpenFootballWorldCup;

      if (!isOpenFootballMatchArray(body.matches)) {
        throw new FootballAdapterError(
          "OpenFootball returned an unexpected worldcup.json shape.",
          "unexpected-response",
        );
      }

      if (body.matches.length === 0) {
        throw new FootballAdapterError(
          "OpenFootball returned no World Cup fixtures.",
          "no-fixtures",
        );
      }

      return {
        fetchedAt: new Date().toISOString(),
        matches: body.matches.map(mapOpenFootballMatchToMatch),
        provider: "openfootball",
        sourceFixtureCount: body.matches.length,
        sourceName: "OpenFootball worldcup.json",
        teams: uniqueTeams(body.matches),
        tournamentName: body.name ?? "World Cup 2026",
      };
    },
  };
}
