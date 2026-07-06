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
import { OddsAdapterError } from "@/lib/odds/types";
import type { OddsEventSummary, OutrightOddsSummary } from "@/lib/odds/types";

const OUTRIGHT_CACHE_TTL_MS = 60 * 60 * 1000;

type OutrightOddsState =
  | "cached-outrights"
  | "fresh-outrights"
  | "no-outrights"
  | "provider-error"
  | "provider-rate-limited"
  | "saved-outrights";

const SAVED_WORLD_CUP_OUTRIGHTS: Array<{
  probability: number;
  team: string;
}> = [
  { probability: 33.4, team: "France" },
  { probability: 15.7, team: "Argentina" },
  { probability: 13.2, team: "Spain" },
  { probability: 7.9, team: "England" },
  { probability: 6.9, team: "Brazil" },
  { probability: 6.2, team: "Portugal" },
  { probability: 5.9, team: "Egypt" },
  { probability: 3.0, team: "Morocco" },
  { probability: 2.5, team: "United States" },
  { probability: 2.2, team: "Norway" },
];

let cachedTheOddsApiOutrights:
  | {
      expiresAt: number;
      lastSuccessfulFetchAt: string;
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

function buildOutrightCard(
  outrightOdds: OutrightOddsSummary[],
  outrightOddsState: OutrightOddsState,
  participants: Participant[],
): MarketWatchCard {
  const outrightOwnerRankings = rankOwnersByOutrightOdds(
    outrightOdds,
    participants,
  );

  return {
    detail:
      outrightOwnerRankings.length > 0
        ? outrightOddsState === "cached-outrights"
          ? "Using latest cached outright odds."
          : outrightOddsState === "saved-outrights"
            ? "Using latest saved outright odds."
          : undefined
        : "Outright odds temporarily unavailable. Check back shortly.",
    eyebrow: "Bookies' implied chance",
    rankingRows:
      outrightOwnerRankings.length > 0
        ? outrightOwnerRankings.slice(0, 3).map((ranking, index) => ({
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
          }))
        : undefined,
    title: "Most Likely to Win...",
  };
}

function toSavedOutrightSummary(team: string, probability: number): OutrightOddsSummary {
  const decimalOdds = Math.round((100 / probability) * 100) / 100;

  return {
    bookmaker: "Latest saved outright odds",
    bookmakerCount: 0,
    decimalOdds,
    impliedProbability: probability,
    marketName: "World Cup winner",
    normalisedImpliedProbability: probability,
    team,
  };
}

function savedWorldCupOutrights(
  participants: Participant[],
): OutrightOddsSummary[] {
  const allocatedTeams = new Set(
    participants
      .flatMap((participant) => participant.teams)
      .map((team) => normaliseTeamName(team.country)),
  );

  // Saved fallback odds are stored at team level so any future sweepstake can
  // map the same World Cup market snapshot onto its own owners.
  return SAVED_WORLD_CUP_OUTRIGHTS.filter((snapshot) =>
    allocatedTeams.has(normaliseTeamName(snapshot.team)),
  ).map((snapshot) =>
    toSavedOutrightSummary(snapshot.team, snapshot.probability),
  );
}

function buildUnderdogCard(
  events: OddsEventSummary[],
  outrightOdds: OutrightOddsSummary[],
  outrightOddsState: OutrightOddsState,
  participants: Participant[],
): MarketWatchCard {
  const teamCandidates = allTeamOddsCandidates(events, participants);
  const biggestUnderdog = [...teamCandidates].sort(
    (a, b) => a.percentage - b.percentage,
  )[0];

  if (biggestUnderdog) {
    return {
      detail: `${biggestUnderdog.owner} has ${teamDisplayName(
        biggestUnderdog.team,
        participants,
      )}, rated at ${percentageLabel(biggestUnderdog.percentage)}. Underdog watch.`,
      eyebrow: "Biggest underdog still alive",
      title: teamDisplayName(biggestUnderdog.team, participants),
    };
  }

  const outrightUnderdog = outrightOdds
    .flatMap((odd) => {
      const owner = findOwnerForTeamName(odd.team, participants);
      const participant = participants.find(({ name }) => name === owner);
      const allocatedTeam = participant?.teams.find(
        (team) =>
          normaliseTeamName(team.country) === normaliseTeamName(odd.team),
      );

      if (
        !owner ||
        allocatedTeam?.status !== "still-in" ||
        !Number.isFinite(odd.impliedProbability) ||
        odd.impliedProbability <= 0
      ) {
        return [];
      }

      return [
        {
          owner,
          percentage: odd.impliedProbability,
          team: allocatedTeam.country,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.percentage - b.percentage || a.owner.localeCompare(b.owner, "en-GB"),
    )[0];

  if (outrightUnderdog) {
    const fallbackNote =
      outrightOddsState === "saved-outrights" ||
      outrightOddsState === "cached-outrights"
        ? " Using outright odds fallback."
        : "";

    return {
      detail: `${outrightUnderdog.owner} has ${teamDisplayName(
        outrightUnderdog.team,
        participants,
      )}, rated at ${precisePercentageLabel(
        outrightUnderdog.percentage,
      )} to win it all. Underdog watch.${fallbackNote}`,
      eyebrow: "Biggest underdog still alive",
      title: teamDisplayName(outrightUnderdog.team, participants),
    };
  }

  return {
    detail:
      events.length > 0
        ? "Waiting for the next underdog story."
        : "Underdog watch temporarily unavailable.",
    eyebrow: "Biggest underdog still alive",
    title: "Biggest underdog still alive",
  };
}

function buildFamilyFeudCard(
  events: OddsEventSummary[],
  outrightOdds: OutrightOddsSummary[],
  participants: Participant[],
  config: SweepstakeConfig,
): MarketWatchCard {
  const excludedOwners = new Set(
    config.relationships?.excludedInsightParticipants ?? [],
  );
  const isExcludedOwner = (owner: string) => excludedOwners.has(owner);
  const familyBranchBattle = events
    .map((event) => {
      const homeOwner = findOwnerForTeamName(event.home, participants);
      const awayOwner = findOwnerForTeamName(event.away, participants);

      if (
        !homeOwner ||
        !awayOwner ||
        isExcludedOwner(homeOwner) ||
        isExcludedOwner(awayOwner)
      ) {
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
    const isFriendsSweepstake = config.copy?.groupStyleLabel === "friends";
    const feudEyebrow = isRelationshipConfigured
      ? familyBranchBattle.relationship.title
      : "Fixture watch";
    const feudTitle =
      familyBranchBattle.relationship.label === "HOMEWRECKER" ||
      familyBranchBattle.relationship.socialType === "dating"
        ? "Next Homewrecker"
        : familyBranchBattle.relationship.socialType === "school-friend"
          ? "Schoolmate bragging rights"
          : isRelationshipConfigured && isFriendsSweepstake
            ? "Friendship on the line"
            : isRelationshipConfigured
              ? "Next Homewrecker"
              : "Next owned-team matchup";
    const odds = fixtureOddsLabel(familyBranchBattle.event, participants);

    return {
      detail: `${teamDisplayName(familyBranchBattle.event.home, participants)} v ${teamDisplayName(familyBranchBattle.event.away, participants)}. ${familyBranchBattle.homeOwner} vs. ${familyBranchBattle.awayOwner}. ${familyBranchBattle.relationship.copy} ${fixtureOddsLabel(familyBranchBattle.event, participants)}.`,
      eyebrow: feudEyebrow,
      feudLines: {
        banter: familyBranchBattle.relationship.copy,
        date: kickoffLabel(familyBranchBattle.event.kickoffAt),
        fixture: `${teamDisplayName(familyBranchBattle.event.home, participants)} v ${teamDisplayName(familyBranchBattle.event.away, participants)}`,
        odds: odds === "Odds TBC" ? undefined : odds,
        owners: `${familyBranchBattle.homeOwner} vs. ${familyBranchBattle.awayOwner}`,
      },
      title: feudTitle,
    };
  }

  const ownerRankings = rankOwnersByOutrightOdds(
    outrightOdds,
    participants,
  ).filter((ranking) => !isExcludedOwner(ranking.owner));
  const [leader, chaser] = ownerRankings;

  if (leader && chaser) {
    const leaderTeams = leader.teams
      .map((team) => teamDisplayName(team.team, participants))
      .join(" / ");
    const chaserTeams = chaser.teams
      .map((team) => teamDisplayName(team.team, participants))
      .join(" / ");

    return {
      detail: `${leader.owner} leads the bookies' board, but ${chaser.owner} is still chasing.`,
      eyebrow: config.copy?.feudEyebrow ?? "Family Feud",
      feudLines: {
        banter: `${leader.owner} leads the bookies' board, but ${chaser.owner} is still chasing.`,
        fixture: `${leaderTeams} vs ${chaserTeams}`,
        owners: `${leader.owner} vs. ${chaser.owner}`,
      },
      title: "Title-race bragging rights",
    };
  }

  return {
    detail:
      config.copy?.genericBraggingRightsCopy ?? "Family bragging rights loading.",
    eyebrow: config.copy?.feudEyebrow ?? "Family Feud",
    title:
      config.copy?.groupStyleLabel === "friends"
        ? "Friendship on the line"
        : "Next Homewrecker",
  };
}

function buildMarketWatchCards(
  events: OddsEventSummary[],
  outrightOdds: OutrightOddsSummary[],
  outrightOddsState: OutrightOddsState,
  participants: Participant[],
  config: SweepstakeConfig,
): MarketWatchCard[] {
  return [
    buildOutrightCard(outrightOdds, outrightOddsState, participants),
    buildUnderdogCard(events, outrightOdds, outrightOddsState, participants),
    buildFamilyFeudCard(events, outrightOdds, participants, config),
  ];
}

function chooseOutrightOddsForDisplay({
  fallbackOutrightOdds,
  fallbackOutrightState,
  participants,
  outrightResult,
}: {
  fallbackOutrightOdds: OutrightOddsSummary[];
  fallbackOutrightState: "cached-outrights" | "saved-outrights";
  participants: Participant[];
  outrightResult: {
    odds: OutrightOddsSummary[];
    state: OutrightOddsState;
  };
}) {
  if (outrightResult.odds.length > 0) {
    return {
      odds: outrightResult.odds,
      state: outrightResult.state,
    };
  }

  if (fallbackOutrightOdds.length > 0) {
    return {
      odds: fallbackOutrightOdds,
      state: fallbackOutrightState,
    };
  }

  const savedOutrights = savedWorldCupOutrights(participants);

  if (savedOutrights.length > 0) {
    return {
      odds: savedOutrights,
      state: "saved-outrights" as const,
    };
  }

  return {
    odds: [],
    state: outrightResult.state,
  };
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

function cachedOutrights() {
  if (!cachedTheOddsApiOutrights) {
    return undefined;
  }

  return {
    odds: cachedTheOddsApiOutrights.value,
    state: "cached-outrights" as const,
  };
}

async function loadTheOddsApiOutrights(participants: Participant[]): Promise<{
  odds: OutrightOddsSummary[];
  state: OutrightOddsState;
}> {
  if (
    cachedTheOddsApiOutrights &&
    cachedTheOddsApiOutrights.expiresAt > Date.now()
  ) {
    return cachedOutrights() ?? { odds: [], state: "no-outrights" };
  }

  if (!process.env.THE_ODDS_API_KEY) {
    return cachedOutrights() ?? { odds: [], state: "no-outrights" };
  }

  try {
    const discovery = await createTheOddsApiAdapter({
      participants,
    }).discoverWorldCupWinnerOutrights();
    const value = discovery.allOutcomes.map(toOutrightOddsSummary);

    cachedTheOddsApiOutrights = {
      expiresAt: Date.now() + OUTRIGHT_CACHE_TTL_MS,
      lastSuccessfulFetchAt: discovery.fetchedAt,
      value,
    };

    return {
      odds: value,
      state: value.length > 0 ? "fresh-outrights" : "no-outrights",
    };
  } catch (error) {
    const cached = cachedOutrights();

    if (cached) {
      return cached;
    }

    if (error instanceof OddsAdapterError && error.code === "rate-limit") {
      return { odds: [], state: "provider-rate-limited" };
    }

    return { odds: [], state: "provider-error" };
  }
}

function emptyPreview(): OddsPreview {
  return {
    available: false,
    bookiesCornerCardCount: 0,
    fixtureOddsByMatchup: {},
    fixtureOddsState: "no-fixture-odds",
    marketWatchCards: [],
    outrightOddsState: "no-outrights",
    outrightWinnerAvailable: false,
  };
}

export async function loadOddsPreview(
  participants: Participant[],
  config: SweepstakeConfig,
): Promise<OddsPreview> {
  const cachedDiscovery = await loadOddsDiscoveryWithCache();
  const savedOutrights = savedWorldCupOutrights(participants);

  if (!cachedDiscovery.result) {
    const outrightResult = await loadTheOddsApiOutrights(participants);
    const availableOutrights = chooseOutrightOddsForDisplay({
      fallbackOutrightOdds: savedOutrights,
      fallbackOutrightState: "saved-outrights",
      participants,
      outrightResult,
    });
    const marketWatchCards = buildMarketWatchCards(
      [],
      availableOutrights.odds,
      availableOutrights.state,
      participants,
      config,
    );

    return {
      ...emptyPreview(),
      bookiesCornerCardCount: marketWatchCards.length,
      marketWatchCards,
      outrightOddsState: availableOutrights.state,
      outrightWinnerAvailable: availableOutrights.odds.length > 0,
    };
  }

  const discovery = cachedDiscovery.result;
  const outrightResult = await loadTheOddsApiOutrights(participants);
  const availableOutrights = chooseOutrightOddsForDisplay({
    fallbackOutrightOdds:
      discovery.outrightOdds.length > 0
        ? discovery.outrightOdds
        : savedOutrights,
    fallbackOutrightState:
      discovery.outrightOdds.length > 0
        ? "cached-outrights"
        : "saved-outrights",
    participants,
    outrightResult,
  });
  const fixtureOddsByMatchup = buildFixtureOddsMap(
    discovery.oddsExamples,
    participants,
  );
  const marketWatchCards = buildMarketWatchCards(
    discovery.oddsExamples,
    availableOutrights.odds,
    availableOutrights.state,
    participants,
    config,
  );

  return {
    available: discovery.fixtureOddsAvailable,
    bookiesCornerCardCount: marketWatchCards.length,
    cacheState: cachedDiscovery.cacheState,
    fetchedAt: discovery.fetchedAt,
    fixtureOddsByMatchup,
    fixtureOddsState:
      Object.keys(fixtureOddsByMatchup).length > 0
        ? "fixture-odds"
        : "no-fixture-odds",
    marketWatchCards,
    oddsAreStale: cachedDiscovery.stale,
    outrightOddsState: availableOutrights.state,
    outrightWinnerAvailable:
      availableOutrights.odds.length > 0 || discovery.outrightWinnerAvailable,
  };
}
