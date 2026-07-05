import type { Participant } from "@/data/sweepstake";
import { familyRelationshipInsight } from "@/lib/familyRelationships";
import type {
  FixtureOddsDisplay,
  MarketWatchCard,
  OddsPreview,
} from "@/lib/odds/displayTypes";
import { loadOddsDiscoveryWithCache } from "@/lib/odds/oddsCache";
import {
  allTeamOddsCandidates,
  findOwnerForTeamName,
  normalisedMatchupKey,
  rankOwnersByAvailableNextMatchOdds,
  rankOwnersByOutrightOdds,
  toFixtureOddsDisplay,
} from "@/lib/odds/helpers";
import type { OddsEventSummary, OutrightOddsSummary } from "@/lib/odds/types";

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

function fixtureOddsLabel(event: OddsEventSummary) {
  const fixtureOdds = toFixtureOddsDisplay(event);

  if (!fixtureOdds) {
    return "Odds TBC";
  }

  return fixtureOdds.probabilities
    .map((probability) => `${probability.label} ${percentageLabel(probability.percentage)}`)
    .join(" · ");
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
  const ownerRankings = rankOwnersByAvailableNextMatchOdds(events, participants);
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
  } else {
    const bestOwnerWithOdds = ownerRankings.find(
      (ranking) => ranking.teams.length > 0,
    );

    if (bestOwnerWithOdds) {
      const rankedTeams = bestOwnerWithOdds.teams
        .map((team) => `${team.team} ${percentageLabel(team.percentage)}`)
        .join(" + ");
      const missingTeams =
        bestOwnerWithOdds.missingTeams.length > 0
          ? ` Odds TBC for ${bestOwnerWithOdds.missingTeams.join(" and ")}.`
          : "";

      cards.push({
        detail: `${rankedTeams} gives ${
          bestOwnerWithOdds.owner
        } a ${percentageLabel(
          bestOwnerWithOdds.percentage,
        )} available next-match outlook.${missingTeams} This is not an outright tournament chance.`,
        eyebrow: "Best next-match outlook",
        title: `${bestOwnerWithOdds.owner} has the strongest next-fixture outlook`,
      });
    }
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

  if (biggestUnderdog && biggestUnderdog.team !== strongestTeam?.team) {
    cards.push({
      detail: `${biggestUnderdog.owner} has ${biggestUnderdog.team}, rated at ${percentageLabel(
        biggestUnderdog.percentage,
      )}. Underdog watch.`,
      eyebrow: "Biggest underdog still alive",
      title: biggestUnderdog.team,
    });
  }

  const familyBranchBattle = events
    .map((event) => {
      const homeOwner = findOwnerForTeamName(event.home, participants);
      const awayOwner = findOwnerForTeamName(event.away, participants);

      if (!homeOwner || !awayOwner) {
        return undefined;
      }

      const relationship = familyRelationshipInsight(homeOwner, awayOwner);

      return {
        awayOwner,
        event,
        homeOwner,
        kickoffAt: event.kickoffAt ? new Date(event.kickoffAt).getTime() : Infinity,
        relationship,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .sort(
      (a, b) =>
        a.relationship.priority - b.relationship.priority ||
        a.kickoffAt - b.kickoffAt,
    )[0];

  if (familyBranchBattle) {
    cards.push({
      detail: `${familyBranchBattle.event.home} (${familyBranchBattle.homeOwner}) v ${familyBranchBattle.event.away} (${familyBranchBattle.awayOwner}). ${familyBranchBattle.relationship.copy} ${fixtureOddsLabel(familyBranchBattle.event)}.`,
      eyebrow: familyBranchBattle.relationship.label,
      title: familyBranchBattle.relationship.title,
    });
  }

  const firstMissingOdds = ownerRankings.find(
    (ranking) => ranking.missingTeams.length > 0 && ranking.teams.length > 0,
  );

  if (firstMissingOdds) {
    cards.push({
      detail: `${firstMissingOdds.owner} has available odds for ${firstMissingOdds.teams
        .map((team) => team.team)
        .join(" and ")}, with Odds TBC for ${firstMissingOdds.missingTeams.join(
        " and ",
      )}.`,
      eyebrow: "Odds gaps",
      title: "Some teams are still TBC",
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
  const cachedDiscovery = await loadOddsDiscoveryWithCache();

  if (!cachedDiscovery.result) {
    return emptyPreview();
  }

  const discovery = cachedDiscovery.result;

  return {
    available: discovery.fixtureOddsAvailable,
    cacheState: cachedDiscovery.cacheState,
    fetchedAt: discovery.fetchedAt,
    fixtureOddsByMatchup: buildFixtureOddsMap(discovery.oddsExamples),
    marketWatchCards: buildMarketWatchCards(
      discovery.oddsExamples,
      discovery.outrightOdds,
      participants,
    ),
    oddsAreStale: cachedDiscovery.stale,
    outrightWinnerAvailable: discovery.outrightWinnerAvailable,
  };
}
