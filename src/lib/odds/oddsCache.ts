/* eslint-disable react-hooks/rules-of-hooks */
import { createOddsApiIoAdapter } from "@/lib/odds/adapters/oddsApiIo";
import { OddsAdapterError } from "@/lib/odds/types";
import type { OddsAdapterErrorCode, OddsDiscoveryResult } from "@/lib/odds/types";

export const ODDS_CACHE_TTL_MS = 60 * 60 * 1000;

export type OddsCacheState =
  | "odds-rate-limited"
  | "odds-unavailable"
  | "using-cached-odds"
  | "using-fresh-odds";

export type OddsFetchErrorCategory =
  | "missing-key"
  | "no-fixtures"
  | "provider-error"
  | "rate-limit";

export type CachedOddsResult = {
  cacheState: OddsCacheState;
  errorCategory?: OddsFetchErrorCategory;
  lastSuccessfulFetchAt?: string;
  result?: OddsDiscoveryResult;
  stale: boolean;
};

let cachedOdds:
  | {
      expiresAt: number;
      value: OddsDiscoveryResult;
    }
  | undefined;

function oddsErrorCategory(
  code?: OddsAdapterErrorCode,
): OddsFetchErrorCategory {
  if (code === "missing-api-key") {
    return "missing-key";
  }

  if (code === "rate-limit") {
    return "rate-limit";
  }

  if (code === "no-events") {
    return "no-fixtures";
  }

  return "provider-error";
}

function cacheStateForError(
  category: OddsFetchErrorCategory,
  hasStaleOdds: boolean,
): OddsCacheState {
  if (category === "rate-limit") {
    return "odds-rate-limited";
  }

  return hasStaleOdds ? "using-cached-odds" : "odds-unavailable";
}

export function shouldFetchFreshOdds(forceRefresh = false) {
  if (forceRefresh) {
    return true;
  }

  if (!cachedOdds) {
    return true;
  }

  return cachedOdds.expiresAt <= Date.now();
}

export function readCachedOdds() {
  return cachedOdds?.value;
}

export function writeCachedOdds(result: OddsDiscoveryResult) {
  cachedOdds = {
    expiresAt: Date.now() + ODDS_CACHE_TTL_MS,
    value: result,
  };
}

export function useStaleOddsFallback(
  errorCategory: OddsFetchErrorCategory,
): CachedOddsResult {
  const staleOdds = readCachedOdds();

  if (staleOdds) {
    return {
      cacheState: cacheStateForError(errorCategory, true),
      errorCategory,
      lastSuccessfulFetchAt: staleOdds.fetchedAt,
      result: staleOdds,
      stale: true,
    };
  }

  return {
    cacheState: cacheStateForError(errorCategory, false),
    errorCategory,
    stale: false,
  };
}

// Server-only cache wrapper. This keeps Odds-API.io free-plan-friendly by
// fetching once per warm runtime and serving the same mapped data to both the
// fixtures section and Bookies' Corner.
export async function loadOddsDiscoveryWithCache({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<CachedOddsResult> {
  const cached = readCachedOdds();

  if (cached && !shouldFetchFreshOdds(forceRefresh)) {
    return {
      cacheState: "using-cached-odds",
      lastSuccessfulFetchAt: cached.fetchedAt,
      result: cached,
      stale: false,
    };
  }

  if (!process.env.ODDS_API_IO_KEY) {
    return useStaleOddsFallback("missing-key");
  }

  try {
    const result = await createOddsApiIoAdapter().discoverWorldCup2026Odds();

    writeCachedOdds(result);

    return {
      cacheState: "using-fresh-odds",
      lastSuccessfulFetchAt: result.fetchedAt,
      result,
      stale: false,
    };
  } catch (error) {
    if (error instanceof OddsAdapterError) {
      return useStaleOddsFallback(oddsErrorCategory(error.code));
    }

    return useStaleOddsFallback("provider-error");
  }
}
