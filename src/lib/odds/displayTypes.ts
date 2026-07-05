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
  title: string;
};

export type OddsPreview = {
  available: boolean;
  fetchedAt?: string;
  fixtureOddsByMatchup: Record<string, FixtureOddsDisplay>;
  marketWatchCards: MarketWatchCard[];
  outrightWinnerAvailable: boolean;
};
