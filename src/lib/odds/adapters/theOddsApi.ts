import type { Participant } from "@/data/sweepstake";
import { normaliseTeamName } from "@/lib/football/ownerLabels";
import { OddsAdapterError } from "@/lib/odds/types";

const DEFAULT_BASE_URL = "https://api.the-odds-api.com/v4";
const SPORT_KEY = "soccer_fifa_world_cup_winner";
const MARKET = "outrights";
const REQUEST_LIMIT = 3;

type TheOddsApiOutcome = {
  name?: string;
  price?: number;
};

type TheOddsApiMarket = {
  key?: string;
  outcomes?: TheOddsApiOutcome[];
};

type TheOddsApiBookmaker = {
  key?: string;
  markets?: TheOddsApiMarket[];
  title?: string;
};

type TheOddsApiEvent = {
  bookmakers?: TheOddsApiBookmaker[];
  commence_time?: string;
  id?: string;
  sport_key?: string;
  sport_title?: string;
};

export type TheOddsApiOutrightSummary = {
  averageDecimalOdds: number;
  bestDecimalOdds: number;
  bookmakerCount: number;
  medianDecimalOdds: number;
  matchedInternalTeam?: string;
  normalisedImpliedProbability: number;
  rawImpliedProbability: number;
  team: string;
};

export type TheOddsApiOutrightDiscovery = {
  allOutcomes: TheOddsApiOutrightSummary[];
  bookmakerCount: number;
  currentRemainingTeamsFound: string[];
  fetchedAt: string;
  firstOutcomes: TheOddsApiOutrightSummary[];
  householdChancePossible: boolean;
  matchedRemainingTeams: string[];
  market: typeof MARKET;
  outcomeCount: number;
  ownerChancePossible: boolean;
  provider: "the-odds-api";
  requestCount: number;
  sportKey: typeof SPORT_KEY;
  strongestRemainingTeamPossible: boolean;
  unmatchedRemainingTeams: string[];
  qualityDiagnostics: Array<{
    averageDecimalOdds: number;
    bookmakerCount: number;
    normalisedImpliedProbability: number;
    rawImpliedProbability: number;
    team: string;
    unusuallyHigh: boolean;
  }>;
};

function impliedProbability(decimalOdds: number) {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    return 0;
  }

  return Math.round((100 / decimalOdds) * 10) / 10;
}

function isEventArray(value: unknown): value is TheOddsApiEvent[] {
  return Array.isArray(value);
}

function safeOutcomes(events: TheOddsApiEvent[]) {
  return events.flatMap((event) =>
    (event.bookmakers ?? []).flatMap((bookmaker) =>
      (bookmaker.markets ?? [])
        .filter((market) => market.key === MARKET)
        .flatMap((market) =>
          (market.outcomes ?? []).map((outcome) => ({
            bookmaker: bookmaker.title ?? bookmaker.key ?? "Unknown",
            outcome,
          })),
        ),
    ),
  );
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function remainingTeamNames(participants: Participant[]) {
  return participants.flatMap((participant) =>
    participant.teams
      .filter((team) => team.status === "still-in")
      .map((team) => team.country),
  );
}

// Discovery-only adapter. It is intentionally not used by the visible site yet;
// it checks whether The Odds API can support future outright winner insights.
export function createTheOddsApiAdapter({
  participants,
}: {
  participants: Participant[];
}) {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const baseUrl = process.env.THE_ODDS_API_BASE_URL ?? DEFAULT_BASE_URL;
  let requestCount = 0;

  async function requestOutrights() {
    if (!apiKey) {
      throw new OddsAdapterError(
        "THE_ODDS_API_KEY is missing. Add it locally before running discovery.",
        "missing-api-key",
      );
    }

    if (requestCount >= REQUEST_LIMIT) {
      throw new OddsAdapterError(
        "The Odds API discovery stopped before exceeding the request budget.",
        "rate-limit",
      );
    }

    const url = new URL(
      `${baseUrl.replace(/\/$/, "")}/sports/${SPORT_KEY}/odds`,
    );
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("markets", MARKET);
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("regions", "uk");

    requestCount += 1;

    let response: Response;

    try {
      response = await fetch(url, { cache: "no-store" });
    } catch {
      throw new OddsAdapterError(
        "The Odds API request failed because the network call did not complete.",
        "network-error",
      );
    }

    if (response.status === 429) {
      throw new OddsAdapterError(
        "The Odds API rate limit was reached. Stop testing for now.",
        "rate-limit",
      );
    }

    if (!response.ok) {
      throw new OddsAdapterError(
        `The Odds API returned HTTP ${response.status}.`,
        response.status === 401 || response.status === 403
          ? "missing-api-key"
          : "unexpected-response",
      );
    }

    const payload = await response.json();

    if (!isEventArray(payload)) {
      throw new OddsAdapterError(
        "The Odds API returned an unexpected outrights response shape.",
        "unexpected-response",
      );
    }

    return payload;
  }

  return {
    async discoverWorldCupWinnerOutrights(): Promise<TheOddsApiOutrightDiscovery> {
      const events = await requestOutrights();
      const targetRemainingTeams = remainingTeamNames(participants);
      const teamsByName = new Map(
        participants.flatMap((participant) =>
          participant.teams.map((team) => [normaliseTeamName(team.country), team.country]),
        ),
      );
      const outcomes = safeOutcomes(events);
      const pricesByTeam = new Map<
        string,
        {
          bookmakers: Set<string>;
          prices: number[];
          team: string;
        }
      >();

      for (const { bookmaker, outcome } of outcomes) {
        if (!outcome.name || typeof outcome.price !== "number") {
          continue;
        }

        const normalisedTeam = normaliseTeamName(outcome.name);
        const existing = pricesByTeam.get(normalisedTeam) ?? {
          bookmakers: new Set<string>(),
          prices: [],
          team: outcome.name,
        };

        existing.bookmakers.add(bookmaker);
        existing.prices.push(outcome.price);
        pricesByTeam.set(normalisedTeam, existing);
      }

      const rawSummaries = Array.from(pricesByTeam.entries()).map(
        ([normalisedTeam, teamPrices]) => {
          const averageDecimalOdds = average(teamPrices.prices);
          const rawImpliedProbability = impliedProbability(averageDecimalOdds);

          return {
            averageDecimalOdds: rounded(averageDecimalOdds),
            bestDecimalOdds: Math.max(...teamPrices.prices),
            bookmakerCount: teamPrices.bookmakers.size,
            matchedInternalTeam: teamsByName.get(normalisedTeam),
            medianDecimalOdds: rounded(median(teamPrices.prices)),
            rawImpliedProbability,
            team: teamPrices.team,
          };
        },
      );
      const remainingRawTotal = rawSummaries
        .filter((summary) =>
          targetRemainingTeams.some(
            (team) =>
              normaliseTeamName(summary.team) === normaliseTeamName(team) ||
              normaliseTeamName(summary.matchedInternalTeam ?? "") ===
                normaliseTeamName(team),
          ),
        )
        .reduce((total, summary) => total + summary.rawImpliedProbability, 0);
      // Normalised implied probability divides each team's raw implied
      // probability by the total raw probability for the matched remaining
      // sweepstake teams. This avoids presenting bookmaker overround as a true
      // chance while keeping the relative market outlook useful.
      const mappedOutcomes = rawSummaries
        .map<TheOddsApiOutrightSummary>((summary) => ({
          ...summary,
          normalisedImpliedProbability:
            remainingRawTotal > 0
              ? rounded((summary.rawImpliedProbability / remainingRawTotal) * 100)
              : 0,
        }))
        .sort(
          (a, b) =>
            b.normalisedImpliedProbability - a.normalisedImpliedProbability ||
            a.team.localeCompare(b.team, "en-GB"),
        );
      const matchedRemainingTeams = targetRemainingTeams.filter((team) =>
        mappedOutcomes.some(
          (outcome) =>
            normaliseTeamName(outcome.team) === normaliseTeamName(team) ||
            normaliseTeamName(outcome.matchedInternalTeam ?? "") ===
              normaliseTeamName(team),
        ),
      );

      return {
        allOutcomes: mappedOutcomes,
        bookmakerCount: new Set(
          events.flatMap((event) =>
            (event.bookmakers ?? []).map(
              (bookmaker) => bookmaker.title ?? bookmaker.key ?? "Unknown",
            ),
          ),
        ).size,
        currentRemainingTeamsFound: matchedRemainingTeams,
        fetchedAt: new Date().toISOString(),
        firstOutcomes: mappedOutcomes.slice(0, 12),
        householdChancePossible: matchedRemainingTeams.length > 0,
        matchedRemainingTeams,
        market: MARKET,
        outcomeCount: mappedOutcomes.length,
        ownerChancePossible: matchedRemainingTeams.length > 0,
        provider: "the-odds-api",
        qualityDiagnostics: mappedOutcomes
          .filter((outcome) =>
            targetRemainingTeams.some(
              (team) =>
                normaliseTeamName(team) === normaliseTeamName(outcome.team) ||
                normaliseTeamName(team) ===
                  normaliseTeamName(outcome.matchedInternalTeam ?? ""),
            ),
          )
          .map((outcome) => ({
            averageDecimalOdds: outcome.averageDecimalOdds,
            bookmakerCount: outcome.bookmakerCount,
            normalisedImpliedProbability: outcome.normalisedImpliedProbability,
            rawImpliedProbability: outcome.rawImpliedProbability,
            team: outcome.matchedInternalTeam ?? outcome.team,
            unusuallyHigh: outcome.normalisedImpliedProbability >= 30,
          })),
        requestCount,
        sportKey: SPORT_KEY,
        strongestRemainingTeamPossible: matchedRemainingTeams.length > 0,
        unmatchedRemainingTeams: targetRemainingTeams.filter(
          (team) => !matchedRemainingTeams.includes(team),
        ),
      };
    },
  };
}
