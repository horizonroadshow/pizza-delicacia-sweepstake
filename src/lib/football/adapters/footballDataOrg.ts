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
  type FootballDataAdapter,
  type FootballFixtureSyncResult,
} from "@/lib/football/types";

type FootballDataTeam = {
  id?: number | null;
  name?: string | null;
  tla?: string | null;
};

type FootballDataMatch = {
  awayTeam?: FootballDataTeam;
  homeTeam?: FootballDataTeam;
  id?: number | null;
  score?: {
    fullTime?: {
      away?: number | null;
      home?: number | null;
    };
    winner?: "AWAY_TEAM" | "DRAW" | "HOME_TEAM" | null;
  };
  stage?: string | null;
  status?: string | null;
  utcDate?: string | null;
};

type FootballDataMatchesResponse = {
  competition?: {
    code?: string | null;
    id?: number | null;
    name?: string | null;
  };
  matches?: unknown;
};

const DEFAULT_BASE_URL = "https://api.football-data.org/v4";
const DEFAULT_COMPETITION_CODE = "WC";

function toTeamId(providerTeamId: number): TeamId {
  return `football-data-${providerTeamId}`;
}

function toTeam(team: FootballDataTeam | undefined): Team | undefined {
  if (!team?.id || !team.name) {
    return undefined;
  }

  return {
    country: team.name,
    flag: "◇",
    id: toTeamId(team.id),
  };
}

function toMatchStatus(status: string | null | undefined): MatchStatus {
  if (!status) {
    return "scheduled";
  }

  if (["IN_PLAY", "LIVE", "PAUSED"].includes(status)) {
    return "live";
  }

  if (status === "FINISHED") {
    return "finished";
  }

  if (["POSTPONED", "SUSPENDED", "CANCELED", "CANCELLED"].includes(status)) {
    return "postponed";
  }

  return "scheduled";
}

function toTournamentStage(stage: string | null | undefined): TournamentStage {
  const normalisedStage = stage?.toUpperCase() ?? "";

  if (normalisedStage.includes("LAST_32") || normalisedStage.includes("ROUND_OF_32")) {
    return "round-of-32";
  }

  if (normalisedStage.includes("LAST_16") || normalisedStage.includes("ROUND_OF_16")) {
    return "round-of-16";
  }

  if (normalisedStage.includes("QUARTER")) {
    return "quarter-finals";
  }

  if (normalisedStage.includes("SEMI")) {
    return "semi-finals";
  }

  if (normalisedStage.includes("THIRD")) {
    return "third-place";
  }

  return "final";
}

function winnerTeamId(match: FootballDataMatch): TeamId | null {
  if (match.score?.winner === "HOME_TEAM" && match.homeTeam?.id) {
    return toTeamId(match.homeTeam.id);
  }

  if (match.score?.winner === "AWAY_TEAM" && match.awayTeam?.id) {
    return toTeamId(match.awayTeam.id);
  }

  return null;
}

export function mapFootballDataOrgMatchToMatch(
  match: FootballDataMatch,
): Match {
  if (!match.id) {
    throw new FootballAdapterError(
      "football-data.org match is missing a match id.",
      "unexpected-response",
    );
  }

  const homeTeam = toTeam(match.homeTeam);
  const awayTeam = toTeam(match.awayTeam);

  return {
    awayScore: match.score?.fullTime?.away ?? null,
    awayTeamId: awayTeam?.id ?? null,
    awayTeamPlaceholder: awayTeam ? undefined : "Team TBC",
    homeScore: match.score?.fullTime?.home ?? null,
    homeTeamId: homeTeam?.id ?? null,
    homeTeamPlaceholder: homeTeam ? undefined : "Team TBC",
    id: `football-data-match-${match.id}`,
    kickoffAt: match.utcDate ?? null,
    nextMatchId: null,
    nextMatchSlot: null,
    round: toTournamentStage(match.stage),
    status: toMatchStatus(match.status),
    winnerTeamId: winnerTeamId(match),
  };
}

function isMatchesArray(response: FootballDataMatchesResponse) {
  return Array.isArray(response.matches);
}

function uniqueTeams(matches: FootballDataMatch[]) {
  const teams = new Map<TeamId, Team>();

  for (const match of matches) {
    const homeTeam = toTeam(match.homeTeam);
    const awayTeam = toTeam(match.awayTeam);

    if (homeTeam) {
      teams.set(homeTeam.id, homeTeam);
    }

    if (awayTeam) {
      teams.set(awayTeam.id, awayTeam);
    }
  }

  return Array.from(teams.values());
}

export function createFootballDataOrgAdapter(): FootballDataAdapter {
  const apiKey = process.env.FOOTBALL_DATA_API_TOKEN;
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? DEFAULT_BASE_URL;

  return {
    provider: "football-data",
    async fetchWorldCupFixtures(
      input: FetchWorldCupFixturesInput,
    ): Promise<FootballFixtureSyncResult> {
      if (!apiKey) {
        throw new FootballAdapterError(
          "FOOTBALL_DATA_API_TOKEN is missing. Add it locally before running football-data.org sync.",
          "missing-api-key",
        );
      }

      const competitionCode =
        input.competitionCode ?? DEFAULT_COMPETITION_CODE;
      const url = new URL(`/competitions/${competitionCode}/matches`, baseUrl);
      url.searchParams.set("season", String(input.season));

      let response: Response;

      try {
        response = await fetch(url, {
          headers: {
            "X-Auth-Token": apiKey,
          },
        });
      } catch {
        throw new FootballAdapterError(
          "Could not reach football-data.org. Check your connection and try again.",
          "network-failure",
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new FootballAdapterError(
          "football-data.org rejected the API token or plan access for this request.",
          "network-failure",
        );
      }

      if (!response.ok) {
        throw new FootballAdapterError(
          `football-data.org returned HTTP ${response.status}.`,
          "network-failure",
        );
      }

      const body = (await response.json()) as FootballDataMatchesResponse;

      if (!isMatchesArray(body)) {
        throw new FootballAdapterError(
          "football-data.org returned an unexpected matches response shape.",
          "unexpected-response",
        );
      }

      const matches = body.matches as FootballDataMatch[];

      if (matches.length === 0) {
        throw new FootballAdapterError(
          "football-data.org returned no matches for the requested World Cup season.",
          "no-fixtures",
        );
      }

      return {
        fetchedAt: new Date().toISOString(),
        matches: matches.map(mapFootballDataOrgMatchToMatch),
        provider: "football-data",
        sourceFixtureCount: matches.length,
        teams: uniqueTeams(matches),
      };
    },
  };
}
