import type { Participant } from "@/data/sweepstake";
import { createOddsApiIoAdapter } from "@/lib/odds/adapters/oddsApiIo";
import type {
  FixtureOddsDisplay,
  MarketWatchCard,
  OddsPreview,
} from "@/lib/odds/displayTypes";
import {
  allTeamOddsCandidates,
  findOwnerForTeamName,
  normalisedMatchupKey,
  rankOwnersByOutrightOdds,
  rankOwnersByAvailableOdds,
  toFixtureOddsDisplay,
} from "@/lib/odds/helpers";
import { OddsAdapterError } from "@/lib/odds/types";
import type { OddsEventSummary, OutrightOddsSummary } from "@/lib/odds/types";

const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedPreview:
  | {
      expiresAt: number;
      value: OddsPreview;
    }
  | undefined;

function buildFixtureOddsMap(events: OddsEventSummary[]) {
  const fixtureOddsByMatchup: Record<string, FixtureOddsDisplay> = {};

  for (const event of events) {
    const displayOdds = toFixtureOddsDisplay(event);

    if (!displayOdds) {
      continue;
    }

    fixtureOddsByMatchup[normalisedMatchupKey(event.home, event.away)] =
      displayOdds;
  }

  return fixtureOddsByMatchup;
}

function percentageLabel(value: number) {
  return `${Math.round(value)}%`;
}

function buildMarketWatchCards(
  events: OddsEventSummary[],
  outrightOdds: OutrightOddsSummary[],
  participants: Participant[],
): MarketWatchCard[] {
  const cards: MarketWatchCard[] = [];
  const outrightOwnerRankings = rankOwnersByOutrightOdds(
    outrightOdds,
    participants,
  );
  const ownerRankings = rankOwnersByAvailableOdds(events, participants);
  const teamCandidates = allTeamOddsCandidates(events, participants);
  const strongestTeam = [...teamCandidates].sort(
    (a, b) => b.percentage - a.percentage,
  )[0];
  const biggestUnderdog = [...teamCandidates].sort(
    (a, b) => a.percentage - b.percentage,
  )[0];

  if (outrightOwnerRankings.length > 0) {
    cards.push({
      detail: outrightOwnerRankings
        .slice(0, 3)
        .map((ranking, index) => {
          const teams = ranking.teams
            .map((team) => `${team.team} ${percentageLabel(team.percentage)}`)
            .join(" + ");

          return `${index + 1}. ${ranking.owner} ${percentageLabel(
            ranking.percentage,
          )} (${teams})`;
        })
        .join(" · "),
      eyebrow: "Most likely to win the £100",
      title: "Outright winner outlook",
    });
  } else if (ownerRankings[0]) {
    cards.push({
      detail: `${ownerRankings[0].team} is rated at ${percentageLabel(
        ownerRankings[0].percentage,
      )} for their next match. This is not an outright tournament chance.`,
      eyebrow: "Best next-match position",
      title: `${ownerRankings[0].owner} has the strongest next-fixture outlook`,
    });
  }

  if (strongestTeam) {
    cards.push({
      detail: `${strongestTeam.owner} has ${strongestTeam.team}, currently ${percentageLabel(
        strongestTeam.percentage,
      )} for their next fixture. Based on upcoming match odds only.`,
      eyebrow: "Strongest remaining team",
      title: strongestTeam.team,
    });
  }

  if (biggestUnderdog) {
    cards.push({
      detail: `${biggestUnderdog.owner} has ${biggestUnderdog.team}, rated at ${percentageLabel(
        biggestUnderdog.percentage,
      )}. Underdog watch.`,
      eyebrow: "Biggest underdog still alive",
      title: biggestUnderdog.team,
    });
  }

  const nextFamilyClash = events
    .map((event) => {
      const homeOwner = findOwnerForTeamName(event.home, participants);
      const awayOwner = findOwnerForTeamName(event.away, participants);

      return homeOwner && awayOwner
        ? {
            awayOwner,
            event,
            homeOwner,
            kickoffAt: event.kickoffAt ? new Date(event.kickoffAt).getTime() : Infinity,
          }
        : undefined;
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .sort((a, b) => a.kickoffAt - b.kickoffAt)[0];

  if (nextFamilyClash) {
    cards.push({
      detail: `${nextFamilyClash.event.home} v ${nextFamilyClash.event.away}. Family bragging rights loading.`,
      eyebrow: "Next family clash",
      title: `${nextFamilyClash.homeOwner} v ${nextFamilyClash.awayOwner}`,
    });
  }

  return cards.slice(0, 5);
}

function emptyPreview(): OddsPreview {
  return {
    available: false,
    fixtureOddsByMatchup: {},
    marketWatchCards: [],
    outrightWinnerAvailable: false,
  };
}

export async function loadOddsPreview(
  participants: Participant[],
): Promise<OddsPreview> {
  if (cachedPreview && cachedPreview.expiresAt > Date.now()) {
    return cachedPreview.value;
  }

  try {
    const discovery = await createOddsApiIoAdapter().discoverWorldCup2026Odds();
    const preview: OddsPreview = {
      available: discovery.fixtureOddsAvailable,
      fetchedAt: discovery.fetchedAt,
      fixtureOddsByMatchup: buildFixtureOddsMap(discovery.oddsExamples),
      marketWatchCards: buildMarketWatchCards(
        discovery.oddsExamples,
        discovery.outrightOdds,
        participants,
      ),
      outrightWinnerAvailable: discovery.outrightWinnerAvailable,
    };

    cachedPreview = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: preview,
    };

    return preview;
  } catch (error) {
    if (error instanceof OddsAdapterError) {
      return emptyPreview();
    }

    return emptyPreview();
  }
}
