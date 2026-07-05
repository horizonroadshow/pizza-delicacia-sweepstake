import {
  loadOddsDiscoveryWithCache,
  readCachedOdds,
} from "@/lib/odds/oddsCache";
import type { OddsCacheState } from "@/lib/odds/oddsCache";
import type { OddsDiscoveryResult } from "@/lib/odds/types";

export type OddsStatusErrorCategory =
  | "mapping-error"
  | "missing-key"
  | "no-fixtures"
  | "provider-error"
  | "rate-limit";

export type OddsStatus = {
  cacheState: OddsCacheState;
  errorCategory?: OddsStatusErrorCategory;
  fixturesRequested: number;
  hasOddsKey: boolean;
  lastCheckedAt: string;
  lastSuccessfulFetchAt?: string;
  matchedFixtures: number;
  oddsFixturesReturned: number;
  providerConfigured: boolean;
  stale: boolean;
  teamNamesFailingOwnerMatch: string[];
  unmatchedFixtures: string[];
};

function fixtureName(fixture: { away: string; home: string }) {
  return `${fixture.home} v ${fixture.away}`;
}

function emptyStatus(
  hasOddsKey: boolean,
  errorCategory?: OddsStatusErrorCategory,
): OddsStatus {
  return {
    cacheState: "odds-unavailable",
    errorCategory,
    fixturesRequested: 0,
    hasOddsKey,
    lastCheckedAt: new Date().toISOString(),
    matchedFixtures: 0,
    oddsFixturesReturned: 0,
    providerConfigured: hasOddsKey,
    stale: false,
    teamNamesFailingOwnerMatch: [],
    unmatchedFixtures: [],
  };
}

function statusFromDiscovery({
  cacheState,
  hasOddsKey,
  result,
  stale,
}: {
  cacheState: OddsCacheState;
  hasOddsKey: boolean;
  result: OddsDiscoveryResult;
  stale: boolean;
}): OddsStatus {
  const oddsFixturesReturned = result.diagnostics.fixtureOddsReturned.length;
  const matchedFixtures = result.diagnostics.fixtureOddsReturned.filter(
    (fixture) => fixture.matched,
  ).length;

  return {
    cacheState,
    errorCategory:
      oddsFixturesReturned === 0
        ? "no-fixtures"
        : result.diagnostics.teamNamesFailingOwnerMatch.length > 0
          ? "mapping-error"
          : undefined,
    fixturesRequested: result.diagnostics.targetFixtures.length,
    hasOddsKey,
    lastCheckedAt: new Date().toISOString(),
    lastSuccessfulFetchAt: result.fetchedAt,
    matchedFixtures,
    oddsFixturesReturned,
    providerConfigured: hasOddsKey,
    stale,
    teamNamesFailingOwnerMatch: result.diagnostics.teamNamesFailingOwnerMatch,
    unmatchedFixtures: result.diagnostics.fixturesNotMatched.map(fixtureName),
  };
}

export async function loadOddsStatus({
  refresh = false,
}: {
  refresh?: boolean;
} = {}): Promise<OddsStatus> {
  const hasOddsKey = Boolean(process.env.ODDS_API_IO_KEY);

  if (!refresh) {
    const cached = readCachedOdds();

    if (cached) {
      return statusFromDiscovery({
        cacheState: "using-cached-odds",
        hasOddsKey,
        result: cached,
        stale: false,
      });
    }

    return emptyStatus(hasOddsKey, hasOddsKey ? undefined : "missing-key");
  }

  const cachedResult = await loadOddsDiscoveryWithCache({ forceRefresh: true });

  if (!cachedResult.result) {
    return {
      ...emptyStatus(hasOddsKey, cachedResult.errorCategory),
      cacheState: cachedResult.cacheState,
      stale: cachedResult.stale,
    };
  }

  return statusFromDiscovery({
    cacheState: cachedResult.cacheState,
    hasOddsKey,
    result: cachedResult.result,
    stale: cachedResult.stale,
  });
}
