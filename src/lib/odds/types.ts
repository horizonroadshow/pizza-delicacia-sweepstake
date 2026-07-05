import type { Match, Team } from "@/data/sweepstake";

export type OddsProvider = "odds-api-io" | "the-odds-api";

export type OddsOutcome = {
  decimalOdds: number;
  impliedProbability: number;
  name: "away" | "draw" | "home";
};

export type OddsMarketSummary = {
  bookmaker: string;
  marketName: string;
  outcomes: OddsOutcome[];
};

export type OutrightOddsSummary = {
  bookmaker: string;
  decimalOdds: number;
  impliedProbability: number;
  marketName: string;
  team: string;
};

export type OddsEventSummary = {
  away: string;
  eventId: string;
  home: string;
  kickoffAt: string | null;
  leagueName?: string;
  leagueSlug?: string;
  mappedMatch: Match;
  markets: OddsMarketSummary[];
  status?: string;
  teams: Team[];
};

export type OddsDiscoveryResult = {
  diagnostics: {
    fixtureOddsReturned: Array<{
      away: string;
      home: string;
      matched: boolean;
    }>;
    fixturesNotMatched: Array<{
      away: string;
      home: string;
    }>;
    fixturesRequested: Array<{
      away: string;
      home: string;
    }>;
    targetFixtures: Array<{
      away: string;
      home: string;
    }>;
    teamNamesFailingOwnerMatch: string[];
  };
  eventSearchCount: number;
  fetchedAt: string;
  fixtureOddsAvailable: boolean;
  likelyWorldCupLeagues: Array<{
    eventCount?: number;
    name: string;
    slug: string;
  }>;
  matchedFixtureEvents: Array<{
    away: string;
    eventId: string;
    home: string;
    kickoffAt: string | null;
    leagueName?: string;
    status?: string;
  }>;
  oddsExamples: OddsEventSummary[];
  outrightOdds: OutrightOddsSummary[];
  outrightWinnerAvailable: boolean;
  outrightWinnerSearchCount: number;
  provider: OddsProvider;
  requestCount: number;
  selectedBookmakers: string[];
  sportsFound: string[];
  usefulForOwnerProbabilityStats: boolean;
  worldCupAvailable: boolean;
};

export type OddsAdapter = {
  discoverWorldCup2026Odds(): Promise<OddsDiscoveryResult>;
};

export type OddsAdapterErrorCode =
  | "missing-api-key"
  | "network-error"
  | "no-events"
  | "rate-limit"
  | "unexpected-response";

export class OddsAdapterError extends Error {
  code: OddsAdapterErrorCode;

  constructor(message: string, code: OddsAdapterErrorCode) {
    super(message);
    this.code = code;
  }
}
