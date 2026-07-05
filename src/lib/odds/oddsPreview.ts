import type { Participant } from "@/data/sweepstake";
import { createOddsApiIoAdapter } from "@/lib/odds/adapters/oddsApiIo";
import type {
  FixtureOddsDisplay,
  MarketWatchCard,
  OddsPreview,
} from "@/lib/odds/displayTypes";
import {
  allTeamOddsCandidates,
  averageEventProbabilities,
  findOwnerForTeamName,
  normalisedMatchupKey,
  rankOwnersByAvailableOdds,
  selectMarketFavourite,
  selectUnderdog,
  toFixtureOddsDisplay,
} from "@/lib/odds/helpers";
import { OddsAdapterError } from "@/lib/odds/types";
import type { OddsEventSummary } from "@/lib/odds/types";

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
  participants: Participant[],
): MarketWatchCard[] {
  const cards: MarketWatchCard[] = [];
  const ownerRankings = rankOwnersByAvailableOdds(events, participants);
  const teamCandidates = allTeamOddsCandidates(events, participants);
  const strongestTeam = [...teamCandidates].sort(
    (a, b) => b.percentage - a.percentage,
  )[0];
  const biggestUnderdog = [...teamCandidates].sort(
    (a, b) => a.percentage - b.percentage,
  )[0];

  if (ownerRankings[0]) {
    cards.push({
      detail: `${ownerRankings[0].team} is rated at ${percentageLabel(
        ownerRankings[0].percentage,
      )} in their next match. Best available team chance only.`,
      eyebrow: "Most likely to win the £100",
      title: `${ownerRankings[0].owner}'s £100 dream is alive`,
    });
  }

  if (strongestTeam) {
    cards.push({
      detail: `${strongestTeam.owner} has ${strongestTeam.team}, currently ${percentageLabel(
        strongestTeam.percentage,
      )} for their next fixture. The market likes this one.`,
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

  const underdogStory = events
    .map((event) => {
      const odds = averageEventProbabilities(event);
      const favourite = selectMarketFavourite(event, odds);
      const underdog = selectUnderdog(event, odds);

      if (!favourite || !underdog) {
        return undefined;
      }

      const underdogOwner = findOwnerForTeamName(underdog.team, participants);

      return underdogOwner
        ? {
            owner: underdogOwner,
            percentage: underdog.percentage,
            team: underdog.team,
          }
        : undefined;
    })
    .filter((story): story is NonNullable<typeof story> => Boolean(story))
    .sort((a, b) => a.percentage - b.percentage)[0];

  if (underdogStory) {
    cards.push({
      detail: `${underdogStory.owner}'s ${underdogStory.team} are still alive at ${percentageLabel(
        underdogStory.percentage,
      )} for the next match.`,
      eyebrow: "Underdog story",
      title: "Still alive and dreaming",
    });
  }

  return cards.slice(0, 5);
}

function emptyPreview(): OddsPreview {
  return {
    available: false,
    fixtureOddsByMatchup: {},
    marketWatchCards: [],
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
      marketWatchCards: buildMarketWatchCards(discovery.oddsExamples, participants),
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
