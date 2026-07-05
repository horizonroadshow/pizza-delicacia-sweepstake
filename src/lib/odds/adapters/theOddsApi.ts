import type { Participant } from "@/data/sweepstake";
import { normaliseTeamName, ownerLookup } from "@/lib/football/ownerLabels";
import { OddsAdapterError } from "@/lib/odds/types";

const DEFAULT_BASE_URL = "https://api.the-odds-api.com/v4";
const SPORT_KEY = "soccer_fifa_world_cup_winner";
const MARKET = "outrights";
const REQUEST_LIMIT = 3;
const TARGET_REMAINING_TEAMS = [
  "Morocco",
  "Switzerland",
  "Egypt",
  "Mexico",
  "England",
  "France",
  "Belgium",
  "Colombia",
  "Argentina",
  "Norway",
  "Portugal",
  "Brazil",
  "United States",
  "Spain",
];

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
  decimalOdds: number;
  impliedProbability: number;
  matchedInternalTeam?: string;
  owner?: string;
  team: string;
};

export type TheOddsApiOutrightDiscovery = {
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
        .flatMap((market) => market.outcomes ?? []),
    ),
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
      const ownersByTeam = ownerLookup(participants);
      const teamsByName = new Map(
        participants.flatMap((participant) =>
          participant.teams.map((team) => [normaliseTeamName(team.country), team.country]),
        ),
      );
      const outcomes = safeOutcomes(events);
      const mappedOutcomes = outcomes
        .filter((outcome) => outcome.name && typeof outcome.price === "number")
        .map<TheOddsApiOutrightSummary>((outcome) => {
          const team = outcome.name ?? "Team TBC";
          const normalisedTeam = normaliseTeamName(team);
          const matchedInternalTeam = teamsByName.get(normalisedTeam);

          return {
            decimalOdds: outcome.price ?? 0,
            impliedProbability: impliedProbability(outcome.price ?? 0),
            matchedInternalTeam,
            owner: ownersByTeam.get(normalisedTeam),
            team,
          };
        })
        .sort(
          (a, b) =>
            a.decimalOdds - b.decimalOdds || a.team.localeCompare(b.team, "en-GB"),
        );
      const matchedRemainingTeams = TARGET_REMAINING_TEAMS.filter((team) =>
        mappedOutcomes.some(
          (outcome) =>
            normaliseTeamName(outcome.team) === normaliseTeamName(team) ||
            normaliseTeamName(outcome.matchedInternalTeam ?? "") ===
              normaliseTeamName(team),
        ),
      );

      return {
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
        requestCount,
        sportKey: SPORT_KEY,
        strongestRemainingTeamPossible: matchedRemainingTeams.length > 0,
        unmatchedRemainingTeams: TARGET_REMAINING_TEAMS.filter(
          (team) => !matchedRemainingTeams.includes(team),
        ),
      };
    },
  };
}
