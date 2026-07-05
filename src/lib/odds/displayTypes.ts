export type FixtureOddsProbability = {
  label: string;
  percentage: number;
  side: "away" | "draw" | "home";
};

export type FixtureOddsDisplay = {
  favourite?: string;
  provider: "odds-api-io";
  probabilities: FixtureOddsProbability[];
  underdog?: string;
};

export type MarketWatchCard = {
  detail: string;
  eyebrow: string;
  rankingRows?: Array<{
    owner: string;
    percentage: string;
    place: number;
    teams: string;
  }>;
  title: string;
};

export type OddsPreview = {
  available: boolean;
  cacheState?:
    | "odds-rate-limited"
    | "odds-unavailable"
    | "using-cached-odds"
    | "using-fresh-odds";
  fetchedAt?: string;
  fixtureOddsByMatchup: Record<string, FixtureOddsDisplay>;
  marketWatchCards: MarketWatchCard[];
  oddsAreStale?: boolean;
  outrightWinnerAvailable: boolean;
};
