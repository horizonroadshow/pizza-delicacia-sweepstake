import { NextResponse, type NextRequest } from "next/server";
import { createOddsApiIoAdapter } from "@/lib/odds/adapters/oddsApiIo";
import { OddsAdapterError } from "@/lib/odds/types";

export const dynamic = "force-dynamic";

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

function safeOddsExamples(
  result: Awaited<
    ReturnType<
      ReturnType<typeof createOddsApiIoAdapter>["discoverWorldCup2026Odds"]
    >
  >,
) {
  return result.oddsExamples.map((event) => ({
    away: event.away,
    home: event.home,
    kickoffAt: event.kickoffAt,
    leagueName: event.leagueName,
    markets: event.markets.map((market) => ({
      bookmaker: market.bookmaker,
      marketName: market.marketName,
      outcomes: market.outcomes.map((outcome) => ({
        decimalOdds: outcome.decimalOdds,
        impliedProbability: `${outcome.impliedProbability}%`,
        name: outcome.name,
      })),
    })),
    mappedMatch: {
      awayTeamId: event.mappedMatch.awayTeamId,
      homeTeamId: event.mappedMatch.homeTeamId,
      id: event.mappedMatch.id,
      kickoffAt: event.mappedMatch.kickoffAt,
      round: event.mappedMatch.round,
      status: event.mappedMatch.status,
    },
  }));
}

// Local discovery only. This checks whether Odds-API.io has useful free-plan
// World Cup 2026 odds, but never writes data into the visible sweepstake UI.
export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "Odds-API.io discovery is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const adapter = createOddsApiIoAdapter();

  try {
    const result = await adapter.discoverWorldCup2026Odds();

    return NextResponse.json({
      diagnostics: result.diagnostics,
      eventSearchCount: result.eventSearchCount,
      fetchedAt: result.fetchedAt,
      fixtureOddsAvailable: result.fixtureOddsAvailable,
      likelyWorldCupLeagues: result.likelyWorldCupLeagues
        .filter((league) =>
          `${league.name} ${league.slug}`.toLowerCase().includes("world cup"),
        )
        .slice(0, 12),
      matchedFixtureEvents: result.matchedFixtureEvents,
      oddsExamples: safeOddsExamples(result),
      ok: true,
      outrightOdds: result.outrightOdds.slice(0, 12).map((odd) => ({
        bookmaker: odd.bookmaker,
        impliedProbability: `${odd.impliedProbability}%`,
        marketName: odd.marketName,
        team: odd.team,
      })),
      outrightWinnerAvailable: result.outrightWinnerAvailable,
      outrightWinnerSearchCount: result.outrightWinnerSearchCount,
      provider: result.provider,
      requestCount: result.requestCount,
      selectedBookmakerCount: result.selectedBookmakers.length,
      sportsFound: result.sportsFound,
      usefulForOwnerProbabilityStats: result.usefulForOwnerProbabilityStats,
      worldCupAvailable: result.worldCupAvailable,
      writeMode: "read-only odds discovery",
    });
  } catch (error) {
    if (error instanceof OddsAdapterError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.message,
          ok: false,
          provider: "odds-api-io",
        },
        { status: error.code === "missing-api-key" ? 400 : 502 },
      );
    }

    return NextResponse.json(
      {
        code: "unexpected-response",
        error: "Odds-API.io discovery failed unexpectedly.",
        ok: false,
        provider: "odds-api-io",
      },
      { status: 500 },
    );
  }
}
