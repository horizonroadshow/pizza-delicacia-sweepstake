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

type ApiFootballTeam = {
  id?: number | null;
  logo?: string | null;
  name?: string | null;
};

type ApiFootballFixture = {
  fixture?: {
    date?: string | null;
    id?: number | null;
    status?: {
      short?: string | null;
    };
  };
  goals?: {
    away?: number | null;
    home?: number | null;
  };
  league?: {
    round?: string | null;
  };
  score?: {
    fulltime?: {
      away?: number | null;
      home?: number | null;
    };
  };
  teams?: {
    away?: ApiFootballTeam & { winner?: boolean | null };
    home?: ApiFootballTeam & { winner?: boolean | null };
  };
};

type ApiFootballFixturesResponse = {
  errors?: unknown;
  response?: unknown;
};

const DEFAULT_BASE_URL = "https://v3.football.api-sports.io";

function toTeamId(providerTeamId: number): TeamId {
  return `api-football-${providerTeamId}`;
}

function toTeam(team: ApiFootballTeam | undefined): Team | undefined {
  if (!team?.id || !team.name) {
    return undefined;
  }

  return {
    country: team.name,
    flag: "◇",
    id: toTeamId(team.id),
  };
}

function toMatchStatus(statusShort: string | null | undefined): MatchStatus {
  if (!statusShort) {
    return "scheduled";
  }

  if (["1H", "2H", "ET", "BT", "P", "LIVE", "HT"].includes(statusShort)) {
    return "live";
  }

  if (["FT", "AET", "PEN"].includes(statusShort)) {
    return "finished";
  }

  if (["PST", "CANC", "ABD", "AWD", "WO"].includes(statusShort)) {
    return "postponed";
  }

  return "scheduled";
}

function toTournamentStage(round: string | null | undefined): TournamentStage {
  const normalisedRound = round?.toLowerCase() ?? "";

  if (normalisedRound.includes("round of 32")) {
    return "round-of-32";
  }

  if (
    normalisedRound.includes("round of 16") ||
    normalisedRound.includes("8th finals")
  ) {
    return "round-of-16";
  }

  if (normalisedRound.includes("quarter")) {
    return "quarter-finals";
  }

  if (normalisedRound.includes("semi")) {
    return "semi-finals";
  }

  if (normalisedRound.includes("third")) {
    return "third-place";
  }

  return "final";
}

function score(
  fixture: ApiFootballFixture,
  side: "home" | "away",
): number | null {
  return (
    fixture.score?.fulltime?.[side] ??
    fixture.goals?.[side] ??
    null
  );
}

function winnerTeamId(fixture: ApiFootballFixture): TeamId | null {
  const homeWinner = fixture.teams?.home?.winner;
  const awayWinner = fixture.teams?.away?.winner;

  if (homeWinner && fixture.teams?.home?.id) {
    return toTeamId(fixture.teams.home.id);
  }

  if (awayWinner && fixture.teams?.away?.id) {
    return toTeamId(fixture.teams.away.id);
  }

  return null;
}

export function mapApiFootballFixtureToMatch(
  fixture: ApiFootballFixture,
): Match {
  const fixtureId = fixture.fixture?.id;

  if (!fixtureId) {
    throw new FootballAdapterError(
      "API-Football fixture is missing a fixture id.",
      "unexpected-response",
    );
  }

  const homeTeam = toTeam(fixture.teams?.home);
  const awayTeam = toTeam(fixture.teams?.away);

  return {
    awayScore: score(fixture, "away"),
    awayTeamId: awayTeam?.id ?? null,
    awayTeamPlaceholder: awayTeam ? undefined : "Team TBC",
    homeScore: score(fixture, "home"),
    homeTeamId: homeTeam?.id ?? null,
    homeTeamPlaceholder: homeTeam ? undefined : "Team TBC",
    id: `api-football-fixture-${fixtureId}`,
    kickoffAt: fixture.fixture?.date ?? null,
    nextMatchId: null,
    nextMatchSlot: null,
    round: toTournamentStage(fixture.league?.round),
    status: toMatchStatus(fixture.fixture?.status?.short),
    winnerTeamId: winnerTeamId(fixture),
  };
}

function isFixtureArray(response: ApiFootballFixturesResponse) {
  return Array.isArray(response.response);
}

function uniqueTeams(fixtures: ApiFootballFixture[]) {
  const teams = new Map<TeamId, Team>();

  for (const fixture of fixtures) {
    const homeTeam = toTeam(fixture.teams?.home);
    const awayTeam = toTeam(fixture.teams?.away);

    if (homeTeam) {
      teams.set(homeTeam.id, homeTeam);
    }

    if (awayTeam) {
      teams.set(awayTeam.id, awayTeam);
    }
  }

  return Array.from(teams.values());
}

export function createApiFootballAdapter(): FootballDataAdapter {
  const apiKey = process.env.API_FOOTBALL_API_KEY;
  const baseUrl = process.env.API_FOOTBALL_BASE_URL ?? DEFAULT_BASE_URL;

  return {
    provider: "api-football",
    async fetchWorldCupFixtures(
      input: FetchWorldCupFixturesInput,
    ): Promise<FootballFixtureSyncResult> {
      if (!apiKey) {
        throw new FootballAdapterError(
          "API_FOOTBALL_API_KEY is missing. Add it locally before running football sync.",
          "missing-api-key",
        );
      }

      if (!input.leagueId) {
        throw new FootballAdapterError(
          "API-Football sync needs a league ID.",
          "unexpected-response",
        );
      }

      const url = new URL("/fixtures", baseUrl);
      url.searchParams.set("league", String(input.leagueId));
      url.searchParams.set("season", String(input.season));

      let response: Response;

      try {
        response = await fetch(url, {
          headers: {
            "x-apisports-key": apiKey,
          },
        });
      } catch {
        throw new FootballAdapterError(
          "Could not reach API-Football. Check your connection and try again.",
          "network-failure",
        );
      }

      if (!response.ok) {
        throw new FootballAdapterError(
          `API-Football returned HTTP ${response.status}.`,
          "network-failure",
        );
      }

      const body = (await response.json()) as ApiFootballFixturesResponse;

      if (!isFixtureArray(body)) {
        throw new FootballAdapterError(
          "API-Football returned an unexpected fixture response shape.",
          "unexpected-response",
        );
      }

      const fixtures = body.response as ApiFootballFixture[];

      if (fixtures.length === 0) {
        throw new FootballAdapterError(
          "API-Football returned no fixtures for the requested World Cup season.",
          "no-fixtures",
        );
      }

      return {
        fetchedAt: new Date().toISOString(),
        matches: fixtures.map(mapApiFootballFixtureToMatch),
        provider: "api-football",
        sourceFixtureCount: fixtures.length,
        teams: uniqueTeams(fixtures),
      };
    },
  };
}
