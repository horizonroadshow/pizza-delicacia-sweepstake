import type { Participant } from "@/data/sweepstake";
import type { SweepstakeConfig } from "@/data/sweepstakes";
import { familyRelationshipInsight } from "@/lib/familyRelationships";
import { normaliseTeamName } from "@/lib/football/ownerLabels";
import type {
  FixtureOddsDisplay,
  MarketWatchCard,
  OddsPreview,
} from "@/lib/odds/displayTypes";
import { createTheOddsApiAdapter } from "@/lib/odds/adapters/theOddsApi";
import type { TheOddsApiOutrightSummary } from "@/lib/odds/adapters/theOddsApi";
import { loadOddsDiscoveryWithCache } from "@/lib/odds/oddsCache";
import {
  allTeamOddsCandidates,
  findOwnerForTeamName,
  normalisedMatchupKey,
  rankOwnersByOutrightOdds,
  toFixtureOddsDisplay,
} from "@/lib/odds/helpers";
import type { OddsEventSummary, OutrightOddsSummary } from "@/lib/odds/types";

const OUTRIGHT_CACHE_TTL_MS = 60 * 60 * 1000;

let cachedTheOddsApiOutrights:
  | {
      expiresAt: number;
      value: OutrightOddsSummary[];
    }
  | undefined;

function buildFixtureOddsMap(
  events: OddsEventSummary[],
  participants: Participant[],
) {
  const fixtureOddsByMatchup: Record<string, FixtureOddsDisplay> = {};

  for (const event of events) {
    const displayOdds = toFixtureOddsDisplay(event);

    if (!displayOdds) {
      continue;
    }

    fixtureOddsByMatchup[normalisedMatchupKey(event.home, event.away)] =
      withFlaggedOddsLabels(displayOdds, participants);
  }

  return fixtureOddsByMatchup;
}

function percentageLabel(value: number) {
  return `${Math.round(value)}%`;
}

function precisePercentageLabel(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function kickoffLabel(kickoffAt: string | null) {
  if (!kickoffAt) {
    return undefined;
  }

  const date = new Date(kickoffAt);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/London",
    weekday: "short",
  }).format(date);
}

function teamFlag(teamName: string, participants: Participant[]) {
  const allocatedTeam = participants
    .flatMap((participant) => participant.teams)
    .find(
      (team) => normaliseTeamName(team.country) === normaliseTeamName(teamName),
    );

  return allocatedTeam?.flag;
}

function teamDisplayName(teamName: string, participants: Participant[]) {
  if (teamName === "Draw") {
    return teamName;
  }

  const flag = teamFlag(teamName, participants);

  if (!flag || teamName.includes(flag)) {
    return teamName;
  }

  return `${teamName} ${flag}`;
}

function fixtureOddsLabel(event: OddsEventSummary, participants: Participant[]) {
  const fixtureOdds = toFixtureOddsDisplay(event);

  if (!fixtureOdds) {
    return "Odds TBC";
  }

  return fixtureOdds.probabilities
    .map(
      (probability) =>
        `${teamDisplayName(probability.label, participants)} ${percentageLabel(
          probability.percentage,
        )}`,
    )
    .join(" · ");
}

function withFlaggedOddsLabels(
  displayOdds: FixtureOddsDisplay,
  participants: Participant[],
): FixtureOddsDisplay {
  return {
    ...displayOdds,
    favourite: displayOdds.favourite
      ? teamDisplayName(displayOdds.favourite, participants)
      : undefined,
    probabilities: displayOdds.probabilities.map((probability) => ({
      ...probability,
      label: teamDisplayName(probability.label, participants),
    })),
    underdog: displayOdds.underdog
      ? teamDisplayName(displayOdds.underdog, participants)
      : undefined,
  };
}

function buildMarketWatchCards(
  events: OddsEventSummary[],
  outrightOdds: OutrightOddsSummary[],
  participants: Participant[],
  config: SweepstakeConfig,
): MarketWatchCard[] {
  const cards: MarketWatchCard[] = [];
  const outrightOwnerRankings = rankOwnersByOutrightOdds(
    outrightOdds,
    participants,
  );
  const teamCandidates = allTeamOddsCandidates(events, participants);
  const biggestUnderdog = [...teamCandidates].sort(
    (a, b) => a.percentage - b.percentage,
  )[0];

  if (outrightOwnerRankings.length > 0) {
    cards.push({
      detail: "Normalised market-implied probabilities across remaining teams.",
      eyebrow: "Bookies' implied chance",
      rankingRows: outrightOwnerRankings
        .slice(0, 3)
        .map((ranking, index) => ({
          owner: ranking.owner,
          percentage: precisePercentageLabel(ranking.percentage),
          place: index + 1,
          teams: ranking.teams
            .map(
              (team) =>
                `${teamDisplayName(team.team, participants)} ${precisePercentageLabel(
                  team.percentage,
                )}`,
            )
            .join(" + "),
        })),
      title: "Most Likely to Win...",
    });
  }

  if (biggestUnderdog) {
    cards.push({
      detail: `${biggestUnderdog.owner} has ${teamDisplayName(
        biggestUnderdog.team,
        participants,
      )}, rated at ${percentageLabel(biggestUnderdog.percentage)}. Underdog watch.`,
      eyebrow: "Biggest underdog still alive",
      title: teamDisplayName(biggestUnderdog.team, participants),
    });
  }

  const familyBranchBattle = events
    .map((event) => {
      const homeOwner = findOwnerForTeamName(event.home, participants);
      const awayOwner = findOwnerForTeamName(event.away, participants);

      if (!homeOwner || !awayOwner) {
        return undefined;
      }

      const relationship = familyRelationshipInsight(
        homeOwner,
        awayOwner,
        config.relationships,
      );

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
    const isRelationshipConfigured = Boolean(config.relationships);
    const feudEyebrow = isRelationshipConfigured
      ? familyBranchBattle.relationship.title
      : "Fixture watch";
    const feudTitle = isRelationshipConfigured
      ? "Next Homewrecker"
      : "Next owned-team matchup";

    cards.push({
      detail: `${teamDisplayName(familyBranchBattle.event.home, participants)} v ${teamDisplayName(familyBranchBattle.event.away, participants)}. ${familyBranchBattle.homeOwner} vs. ${familyBranchBattle.awayOwner}. ${familyBranchBattle.relationship.copy} ${fixtureOddsLabel(familyBranchBattle.event, participants)}.`,
      eyebrow: feudEyebrow,
      feudLines: {
        banter: familyBranchBattle.relationship.copy,
        date: kickoffLabel(familyBranchBattle.event.kickoffAt),
        fixture: `${teamDisplayName(familyBranchBattle.event.home, participants)} v ${teamDisplayName(familyBranchBattle.event.away, participants)}`,
        odds: fixtureOddsLabel(familyBranchBattle.event, participants),
        owners: `${familyBranchBattle.homeOwner} vs. ${familyBranchBattle.awayOwner}`,
      },
      title: feudTitle,
    });
  }

  return cards.slice(0, 3);
}

function toOutrightOddsSummary(
  outcome: TheOddsApiOutrightSummary,
): OutrightOddsSummary {
  return {
    averageDecimalOdds: outcome.averageDecimalOdds,
    bestDecimalOdds: outcome.bestDecimalOdds,
    bookmaker: `${outcome.bookmakerCount} bookmaker${
      outcome.bookmakerCount === 1 ? "" : "s"
    } averaged`,
    bookmakerCount: outcome.bookmakerCount,
    decimalOdds: outcome.averageDecimalOdds,
    impliedProbability: outcome.normalisedImpliedProbability,
    marketName: "World Cup winner",
    medianDecimalOdds: outcome.medianDecimalOdds,
    normalisedImpliedProbability: outcome.normalisedImpliedProbability,
    rawImpliedProbability: outcome.rawImpliedProbability,
    team: outcome.matchedInternalTeam ?? outcome.team,
  };
}

async function loadTheOddsApiOutrights(participants: Participant[]) {
  if (
    cachedTheOddsApiOutrights &&
    cachedTheOddsApiOutrights.expiresAt > Date.now()
  ) {
    return cachedTheOddsApiOutrights.value;
  }

  if (!process.env.THE_ODDS_API_KEY) {
    return [];
  }

  try {
    const discovery = await createTheOddsApiAdapter({
      participants,
    }).discoverWorldCupWinnerOutrights();
    const value = discovery.allOutcomes.map(toOutrightOddsSummary);

    cachedTheOddsApiOutrights = {
      expiresAt: Date.now() + OUTRIGHT_CACHE_TTL_MS,
      value,
    };

    return value;
  } catch {
    return cachedTheOddsApiOutrights?.value ?? [];
  }
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
  config: SweepstakeConfig,
): Promise<OddsPreview> {
  const cachedDiscovery = await loadOddsDiscoveryWithCache();

  if (!cachedDiscovery.result) {
    return emptyPreview();
  }

  const discovery = cachedDiscovery.result;
  const outrightOdds =
    (await loadTheOddsApiOutrights(participants)) ?? discovery.outrightOdds;
  const availableOutrightOdds =
    outrightOdds.length > 0 ? outrightOdds : discovery.outrightOdds;

  return {
    available: discovery.fixtureOddsAvailable,
    cacheState: cachedDiscovery.cacheState,
    fetchedAt: discovery.fetchedAt,
    fixtureOddsByMatchup: buildFixtureOddsMap(discovery.oddsExamples, participants),
    marketWatchCards: buildMarketWatchCards(
      discovery.oddsExamples,
      availableOutrightOdds,
      participants,
      config,
    ),
    oddsAreStale: cachedDiscovery.stale,
    outrightWinnerAvailable:
      availableOutrightOdds.length > 0 || discovery.outrightWinnerAvailable,
  };
}
