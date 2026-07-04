import type { Match, Team } from "@/data/sweepstake";

export type FootballProviderId =
  | "api-football"
  | "football-data"
  | "openfootball";

export type FetchWorldCupFixturesInput = {
  competitionCode?: string;
  leagueId?: number;
  season: number;
  sourceUrl?: string;
};

export type FootballFixtureSyncResult = {
  fetchedAt: string;
  matches: Match[];
  provider: FootballProviderId;
  sourceFixtureCount: number;
  teams: Team[];
};

export type FootballDataAdapter = {
  fetchWorldCupFixtures(
    input: FetchWorldCupFixturesInput,
  ): Promise<FootballFixtureSyncResult>;
  provider: FootballProviderId;
};

export class FootballAdapterError extends Error {
  constructor(
    message: string,
    readonly code:
      | "missing-api-key"
      | "network-failure"
      | "unexpected-response"
      | "no-fixtures",
  ) {
    super(message);
    this.name = "FootballAdapterError";
  }
}
