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
  detail?: string;
  eyebrow: string;
  feudLines?: {
    banter: string;
    date?: string;
    fixture: string;
    odds?: string;
    owners: string;
  };
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
  bookiesCornerCardCount?: number;
  cacheState?:
    | "odds-rate-limited"
    | "odds-unavailable"
    | "using-cached-odds"
    | "using-fresh-odds";
  fetchedAt?: string;
  fixtureOddsByMatchup: Record<string, FixtureOddsDisplay>;
  fixtureOddsState?: "fixture-odds" | "no-fixture-odds";
  marketWatchCards: MarketWatchCard[];
  oddsAreStale?: boolean;
  outrightOddsState?:
    | "cached-outrights"
    | "fresh-outrights"
    | "no-outrights"
    | "provider-error"
    | "provider-rate-limited";
  outrightWinnerAvailable: boolean;
};
