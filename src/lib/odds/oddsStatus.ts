import { createOddsApiIoAdapter } from "@/lib/odds/adapters/oddsApiIo";
import { OddsAdapterError } from "@/lib/odds/types";

export type OddsStatusErrorCategory =
  | "mapping-error"
  | "missing-key"
  | "no-fixtures"
  | "provider-error";

export type OddsStatus = {
  errorCategory?: OddsStatusErrorCategory;
  fixturesRequested: number;
  hasOddsKey: boolean;
  lastCheckedAt: string;
  matchedFixtures: number;
  oddsFixturesReturned: number;
  providerConfigured: boolean;
  teamNamesFailingOwnerMatch: string[];
  unmatchedFixtures: string[];
};

const STATUS_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedStatus:
  | {
      expiresAt: number;
      value: OddsStatus;
    }
  | undefined;

function fixtureName(fixture: { away: string; home: string }) {
  return `${fixture.home} v ${fixture.away}`;
}

function emptyStatus(
  hasOddsKey: boolean,
  errorCategory?: OddsStatusErrorCategory,
): OddsStatus {
  return {
    errorCategory,
    fixturesRequested: 0,
    hasOddsKey,
    lastCheckedAt: new Date().toISOString(),
    matchedFixtures: 0,
    oddsFixturesReturned: 0,
    providerConfigured: hasOddsKey,
    teamNamesFailingOwnerMatch: [],
    unmatchedFixtures: [],
  };
}

function errorCategory(error: OddsAdapterError): OddsStatusErrorCategory {
  if (error.code === "missing-api-key") {
    return "missing-key";
  }

  if (error.code === "no-events") {
    return "no-fixtures";
  }

  return "provider-error";
}

export async function loadOddsStatus(): Promise<OddsStatus> {
  if (cachedStatus && cachedStatus.expiresAt > Date.now()) {
    return cachedStatus.value;
  }

  const hasOddsKey = Boolean(process.env.ODDS_API_IO_KEY);

  if (!hasOddsKey) {
    return emptyStatus(false, "missing-key");
  }

  try {
    const result = await createOddsApiIoAdapter().discoverWorldCup2026Odds();
    const oddsFixturesReturned = result.diagnostics.fixtureOddsReturned.length;
    const matchedFixtures = result.diagnostics.fixtureOddsReturned.filter(
      (fixture) => fixture.matched,
    ).length;
    const status: OddsStatus = {
      errorCategory:
        oddsFixturesReturned === 0
          ? "no-fixtures"
          : result.diagnostics.teamNamesFailingOwnerMatch.length > 0
            ? "mapping-error"
            : undefined,
      fixturesRequested: result.diagnostics.targetFixtures.length,
      hasOddsKey,
      lastCheckedAt: result.fetchedAt,
      matchedFixtures,
      oddsFixturesReturned,
      providerConfigured: true,
      teamNamesFailingOwnerMatch: result.diagnostics.teamNamesFailingOwnerMatch,
      unmatchedFixtures: result.diagnostics.fixturesNotMatched.map(fixtureName),
    };

    cachedStatus = {
      expiresAt: Date.now() + STATUS_CACHE_TTL_MS,
      value: status,
    };

    return status;
  } catch (error) {
    if (error instanceof OddsAdapterError) {
      return emptyStatus(hasOddsKey, errorCategory(error));
    }

    return emptyStatus(hasOddsKey, "provider-error");
  }
}
