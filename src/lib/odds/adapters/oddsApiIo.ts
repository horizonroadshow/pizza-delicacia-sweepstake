import type { Match, MatchStatus, Team, TeamId, TournamentStage } from "@/data/sweepstake";
import { normaliseTeamName, ownerLookup } from "@/lib/football/ownerLabels";
import { activeSweepstakeConfig } from "@/data/sweepstakes";
import { createParticipants } from "@/data/sweepstake";
import {
  OddsAdapterError,
  type OddsAdapter,
  type OddsDiscoveryResult,
  type OddsEventSummary,
  type OddsMarketSummary,
  type OutrightOddsSummary,
} from "@/lib/odds/types";

const DEFAULT_BASE_URL = "https://api.odds-api.io/v3";
const REQUEST_LIMIT = 10;
const TARGET_FIXTURES = [
  ["Brazil", "Norway"],
  ["Mexico", "England"],
  ["Portugal", "Spain"],
  ["United States", "Belgium"],
  ["USA", "Belgium"],
  ["Argentina", "Egypt"],
  ["Switzerland", "Colombia"],
  ["France", "Morocco"],
];
const targetFixtureSummaries = TARGET_FIXTURES.filter(
  ([home]) => home !== "USA",
).map(([home, away]) => ({ away, home }));

type OddsApiIoLeague = {
  eventCount?: number;
  events?: number;
  name?: string;
  slug?: string;
};

type OddsApiIoSport = {
  name?: string;
  slug?: string;
};

type OddsApiIoEvent = {
  away?: string;
  date?: string;
  home?: string;
  id?: number | string;
  league?: {
    name?: string;
    slug?: string;
  };
  sport?: {
    name?: string;
    slug?: string;
  };
  status?: string;
};

type OddsApiIoMarket = {
  name?: string;
  odds?: Array<Record<string, string | number | undefined>>;
  updatedAt?: string;
};

type OddsApiIoOddsEvent = OddsApiIoEvent & {
  bookmakers?: Record<string, OddsApiIoMarket[]>;
};

function slug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normaliseName(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toTeam(country: string): Team {
  return {
    country,
    flag: "◇",
    id: `odds-api-io-${slug(country)}` as TeamId,
  };
}

function status(value: string | undefined): MatchStatus {
  if (value === "live") {
    return "live";
  }

  if (value === "settled" || value === "finished") {
    return "finished";
  }

  if (value === "cancelled" || value === "postponed") {
    return "postponed";
  }

  return "scheduled";
}

function roundFromLeague(leagueName: string | undefined): TournamentStage {
  const normalisedLeague = normaliseName(leagueName);

  if (normalisedLeague.includes("world cup")) {
    return "round-of-16";
  }

  return "group-stage";
}

function mapEventToMatch(event: OddsApiIoEvent): Match {
  const homeTeam = event.home ? toTeam(event.home) : null;
  const awayTeam = event.away ? toTeam(event.away) : null;

  return {
    awayScore: null,
    awayTeamId: awayTeam?.id ?? null,
    awayTeamPlaceholder: awayTeam ? undefined : "Team TBC",
    homeScore: null,
    homeTeamId: homeTeam?.id ?? null,
    homeTeamPlaceholder: homeTeam ? undefined : "Team TBC",
    id: `odds-api-io-event-${event.id ?? slug(`${event.home}-${event.away}`)}`,
    kickoffAt: event.date ?? null,
    nextMatchId: null,
    nextMatchSlot: null,
    round: roundFromLeague(event.league?.name),
    status: status(event.status),
    winnerTeamId: null,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEventArray(value: unknown): value is OddsApiIoEvent[] {
  return Array.isArray(value);
}

function isLeagueArray(value: unknown): value is OddsApiIoLeague[] {
  return Array.isArray(value);
}

function decimalOdds(value: string | number | undefined) {
  const parsedValue =
    typeof value === "number" ? value : value ? Number.parseFloat(value) : NaN;

  return Number.isFinite(parsedValue) && parsedValue > 1 ? parsedValue : null;
}

function impliedProbability(decimalValue: number) {
  return Math.round((1 / decimalValue) * 1000) / 10;
}

function marketSummaries(event: OddsApiIoOddsEvent): OddsMarketSummary[] {
  return Object.entries(event.bookmakers ?? {}).flatMap(([bookmaker, markets]) =>
    markets
      .filter((market) => market.name === "ML" && market.odds?.[0])
      .map((market) => {
        const odds = market.odds?.[0] ?? {};
        const outcomes = (["home", "draw", "away"] as const)
          .map((name) => {
            const parsedOdds = decimalOdds(odds[name]);

            return parsedOdds
              ? {
                  decimalOdds: parsedOdds,
                  impliedProbability: impliedProbability(parsedOdds),
                  name,
                }
              : null;
          })
          .filter((outcome): outcome is NonNullable<typeof outcome> =>
            Boolean(outcome),
          );

        return {
          bookmaker,
          marketName: market.name ?? "ML",
          outcomes,
        };
      }),
  );
}

function likelyOutrightMarketName(name: string | undefined) {
  const normalisedMarket = normaliseName(name);

  return (
    normalisedMarket.includes("winner") ||
    normalisedMarket.includes("outright") ||
    normalisedMarket.includes("futures") ||
    normalisedMarket.includes("champion") ||
    normalisedMarket.includes("tournament")
  );
}

function likelyOutrightEvent(event: OddsApiIoEvent) {
  const name = normaliseName(
    `${event.home ?? ""} ${event.away ?? ""} ${event.league?.name ?? ""} ${
      event.league?.slug ?? ""
    }`,
  );

  return (
    name.includes("world cup") &&
    (name.includes("winner") ||
      name.includes("outright") ||
      name.includes("future") ||
      name.includes("champion") ||
      name.includes("tournament"))
  );
}

function outrightOddsSummaries(event: OddsApiIoOddsEvent): OutrightOddsSummary[] {
  return Object.entries(event.bookmakers ?? {}).flatMap(([bookmaker, markets]) =>
    markets.flatMap((market) => {
      if (!likelyOutrightMarketName(market.name)) {
        return [];
      }

      return (market.odds ?? []).flatMap((odds) =>
        Object.entries(odds).flatMap(([team, value]) => {
          if (["away", "draw", "home", "hdp", "max", "over", "under"].includes(team)) {
            return [];
          }

          const parsedOdds = decimalOdds(value);

          return parsedOdds
            ? [
                {
                  bookmaker,
                  decimalOdds: parsedOdds,
                  impliedProbability: impliedProbability(parsedOdds),
                  marketName: market.name ?? "Outright winner",
                  team,
                },
              ]
            : [];
        }),
      );
    }),
  );
}

function eventName(event: OddsApiIoEvent) {
  return `${event.home ?? ""} ${event.away ?? ""}`;
}

function matchesTargetFixture(event: OddsApiIoEvent) {
  const name = normaliseName(eventName(event));

  return TARGET_FIXTURES.some(([firstTeam, secondTeam]) => {
    const first = normaliseName(firstTeam);
    const second = normaliseName(secondTeam);

    return name.includes(first) && name.includes(second);
  });
}

function matchupKey(home: string | undefined, away: string | undefined) {
  return [normaliseTeamName(home ?? ""), normaliseTeamName(away ?? "")]
    .sort()
    .join("__");
}

function likelyWorldCupLeague(league: OddsApiIoLeague) {
  const name = normaliseName(`${league.name ?? ""} ${league.slug ?? ""}`);

  return (
    name.includes("world cup") ||
    name.includes("fifa") ||
    name.includes("international")
  );
}

function likelyWorldCupEvent(event: OddsApiIoEvent) {
  return likelyWorldCupLeague(event.league ?? {});
}

function selectedBookmakersFromResponse(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (!isObject(value)) {
    return [];
  }

  const possibleValues = [
    value.bookmakers,
    value.selected,
    value.selectedBookmakers,
    value.data,
  ];

  for (const possibleValue of possibleValues) {
    if (Array.isArray(possibleValue)) {
      return possibleValue
        .map((item) =>
          typeof item === "string"
            ? item
            : isObject(item) && typeof item.name === "string"
              ? item.name
              : null,
        )
        .filter((item): item is string => Boolean(item));
    }
  }

  return [];
}

function safeEventSummary(event: OddsApiIoEvent) {
  return {
    away: event.away ?? "Team TBC",
    eventId: String(event.id ?? "unknown"),
    home: event.home ?? "Team TBC",
    kickoffAt: event.date ?? null,
    leagueName: event.league?.name,
    status: event.status,
  };
}

function toOddsEventSummary(event: OddsApiIoOddsEvent): OddsEventSummary {
  const teams = [event.home, event.away]
    .filter((team): team is string => Boolean(team))
    .map(toTeam);

  return {
    ...safeEventSummary(event),
    leagueSlug: event.league?.slug,
    mappedMatch: mapEventToMatch(event),
    markets: marketSummaries(event),
    teams,
  };
}

export function createOddsApiIoAdapter(): OddsAdapter {
  const apiKey = process.env.ODDS_API_IO_KEY;
  const baseUrl = process.env.ODDS_API_IO_BASE_URL ?? DEFAULT_BASE_URL;
  let requestCount = 0;

  async function request<T>(path: string, params: Record<string, string> = {}) {
    if (requestCount >= REQUEST_LIMIT) {
      throw new OddsAdapterError(
        "Odds-API.io discovery stopped before exceeding the request budget.",
        "rate-limit",
      );
    }

    const url = new URL(
      `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
    );

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    if (path !== "/sports") {
      if (!apiKey) {
        throw new OddsAdapterError(
          "ODDS_API_IO_KEY is missing. Add it locally before running odds discovery.",
          "missing-api-key",
        );
      }

      url.searchParams.set("apiKey", apiKey);
    }

    requestCount += 1;

    let response: Response;

    try {
      response = await fetch(url);
    } catch {
      throw new OddsAdapterError(
        "Odds-API.io request failed because the network call did not complete.",
        "network-error",
      );
    }

    if (response.status === 429) {
      throw new OddsAdapterError(
        "Odds-API.io rate limit was reached. Stop testing for now.",
        "rate-limit",
      );
    }

    if (!response.ok) {
      throw new OddsAdapterError(
        `Odds-API.io returned HTTP ${response.status} from ${path}.`,
        response.status === 401 || response.status === 403
          ? "missing-api-key"
          : "unexpected-response",
      );
    }

    return (await response.json()) as T;
  }

  return {
    async discoverWorldCup2026Odds(): Promise<OddsDiscoveryResult> {
      const sports = await request<OddsApiIoSport[]>("/sports");
      const footballSport = sports.find(
        (sport) => sport.slug === "football" || normaliseName(sport.name) === "football",
      );
      const leagues = await request<OddsApiIoLeague[]>("/leagues", {
        sport: "football",
      });
      const selectedBookmakersResponse = await request<unknown>(
        "/bookmakers/selected",
      ).catch((error) => {
        if (
          error instanceof OddsAdapterError &&
          error.code === "unexpected-response"
        ) {
          return [];
        }

        throw error;
      });
      const worldCupSearch = await request<unknown[]>("/events/search", {
        query: "World Cup",
      });
      const outrightWinnerSearch = await request<unknown[]>("/events/search", {
        query: "World Cup winner",
      });
      const outrightFuturesSearch = await request<unknown[]>("/events/search", {
        query: "FIFA World Cup outright",
      });
      const dateRangeEvents = await request<unknown[]>("/events", {
        from: "2026-07-05T00:00:00Z",
        limit: "200",
        sport: "football",
        status: "pending,live",
        to: "2026-07-20T23:59:59Z",
      });

      if (!footballSport || !isLeagueArray(leagues) || !isEventArray(dateRangeEvents)) {
        throw new OddsAdapterError(
          "Odds-API.io returned an unexpected discovery response shape.",
          "unexpected-response",
        );
      }

      const fifaWorldCupLeague = leagues.find((league) =>
        normaliseName(`${league.name ?? ""} ${league.slug ?? ""}`).includes(
          "fifa world cup",
        ),
      );
      const worldCupLeagueEvents = fifaWorldCupLeague?.slug
        ? await request<unknown[]>("/events", {
            from: "2026-07-05T00:00:00Z",
            league: fifaWorldCupLeague.slug,
            limit: "100",
            sport: "football",
            status: "pending,live",
            to: "2026-07-20T23:59:59Z",
          })
        : [];

      if (!isEventArray(worldCupLeagueEvents)) {
        throw new OddsAdapterError(
          "Odds-API.io returned an unexpected World Cup event response shape.",
          "unexpected-response",
        );
      }

      const likelyWorldCupLeagues = leagues.filter(likelyWorldCupLeague).map(
        (league) => ({
          eventCount: league.eventCount ?? league.events,
          name: league.name ?? league.slug ?? "Unnamed league",
          slug: league.slug ?? "",
        }),
      );
      const worldCupEvents = isEventArray(worldCupSearch)
        ? worldCupSearch.filter(likelyWorldCupEvent)
        : [];
      const outrightEvents = [
        ...(isEventArray(outrightWinnerSearch) ? outrightWinnerSearch : []),
        ...(isEventArray(outrightFuturesSearch) ? outrightFuturesSearch : []),
      ];
      const eventLookup = new Map<string, OddsApiIoEvent>();

      for (const event of [...dateRangeEvents, ...worldCupLeagueEvents]) {
        eventLookup.set(String(event.id ?? eventName(event)), event);
      }

      const upcomingEvents = Array.from(eventLookup.values());
      const matchedFixtureEvents = upcomingEvents.filter(matchesTargetFixture);
      const selectedBookmakers = selectedBookmakersFromResponse(
        selectedBookmakersResponse,
      );
      const bookmakers =
        selectedBookmakers.length > 0
          ? selectedBookmakers.slice(0, 2)
          : ["Bet365", "Unibet"];
      const oddsEvents =
        matchedFixtureEvents.length > 0
          ? await request<OddsApiIoOddsEvent[]>("/odds/multi", {
              bookmakers: bookmakers.join(","),
              eventIds: matchedFixtureEvents
                .slice(0, 10)
                .map((event) => String(event.id))
                .join(","),
            })
          : [];
      const oddsExamples = Array.isArray(oddsEvents)
        ? oddsEvents.map(toOddsEventSummary).filter((event) => event.markets.length > 0)
        : [];
      const likelyOutrightEvents = outrightEvents.filter(likelyOutrightEvent);
      const outrightOddsEvents =
        likelyOutrightEvents.length > 0
          ? await request<OddsApiIoOddsEvent[]>("/odds/multi", {
              bookmakers: bookmakers.join(","),
              eventIds: likelyOutrightEvents
                .slice(0, 5)
                .map((event) => String(event.id))
                .join(","),
            })
          : [];
      const outrightOdds = Array.isArray(outrightOddsEvents)
        ? outrightOddsEvents.flatMap(outrightOddsSummaries)
        : [];
      const oddsExampleKeys = new Set(
        oddsExamples.map((event) => matchupKey(event.home, event.away)),
      );
      const matchedFixtureKeys = new Set(
        matchedFixtureEvents.map((event) => matchupKey(event.home, event.away)),
      );
      const participants = createParticipants(activeSweepstakeConfig);
      const ownersByTeam = ownerLookup(participants);
      const teamNamesFailingOwnerMatch = Array.from(
        new Set(
          oddsExamples
            .flatMap((event) => [event.home, event.away])
            .filter(
              (teamName) =>
                !ownersByTeam.has(normaliseTeamName(teamName)) &&
                targetFixtureSummaries.some(
                  (fixture) =>
                    normaliseTeamName(fixture.home) === normaliseTeamName(teamName) ||
                    normaliseTeamName(fixture.away) === normaliseTeamName(teamName),
                ),
            ),
        ),
      ).sort((a, b) => a.localeCompare(b, "en-GB"));

      return {
        diagnostics: {
          fixtureOddsReturned: oddsExamples.map((event) => ({
            away: event.away,
            home: event.home,
            matched: oddsExampleKeys.has(matchupKey(event.home, event.away)),
          })),
          fixturesNotMatched: targetFixtureSummaries.filter(
            (fixture) =>
              !matchedFixtureKeys.has(matchupKey(fixture.home, fixture.away)),
          ),
          fixturesRequested: matchedFixtureEvents.map((event) => ({
            away: event.away ?? "Team TBC",
            home: event.home ?? "Team TBC",
          })),
          targetFixtures: targetFixtureSummaries,
          teamNamesFailingOwnerMatch,
        },
        eventSearchCount: worldCupEvents.length,
        fetchedAt: new Date().toISOString(),
        fixtureOddsAvailable: oddsExamples.length > 0,
        likelyWorldCupLeagues,
        matchedFixtureEvents: matchedFixtureEvents.map(safeEventSummary),
        oddsExamples,
        outrightOdds,
        outrightWinnerAvailable: outrightOdds.length > 0,
        outrightWinnerSearchCount: outrightEvents.length,
        provider: "odds-api-io",
        requestCount,
        selectedBookmakers: bookmakers,
        sportsFound: sports
          .map((sport) => sport.slug ?? sport.name)
          .filter((sport): sport is string => Boolean(sport))
          .slice(0, 20),
        usefulForOwnerProbabilityStats: oddsExamples.length > 0,
        worldCupAvailable:
          likelyWorldCupLeagues.length > 0 || worldCupEvents.length > 0,
      };
    },
  };
}
