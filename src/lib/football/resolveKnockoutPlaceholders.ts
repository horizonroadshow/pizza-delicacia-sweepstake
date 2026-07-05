import type { Match, MatchSlot, Team } from "@/data/sweepstake";

const nextKnockoutRound: Partial<Record<Match["round"], Match["round"]>> = {
  "round-of-32": "round-of-16",
  "round-of-16": "quarter-finals",
  "quarter-finals": "semi-finals",
  "semi-finals": "final",
};

function matchNumber(match: Match) {
  const numberMatch = /\d+$/.exec(match.id);

  return numberMatch?.[0];
}

type MatchReference = {
  kind: "loser" | "winner";
  matchNumber: string;
};

function referencedMatchPath(placeholder: string | undefined): MatchReference | null {
  if (!placeholder) {
    return null;
  }

  const normalisedPlaceholder = placeholder.trim();
  const compactWinnerPath = /^W(\d+)$/i.exec(normalisedPlaceholder);
  const compactLoserPath = /^L(\d+)$/i.exec(normalisedPlaceholder);
  const winnerMatchPath = /^Winner(?:\s+of)?\s+Match\s+(\d+)$/i.exec(
    normalisedPlaceholder,
  );
  const loserMatchPath =
    /^Loser(?:\s+of)?\s+Match\s+(\d+)$/i.exec(normalisedPlaceholder) ??
    /^Runner-up(?:\s+of)?\s+Match\s+(\d+)$/i.exec(normalisedPlaceholder);

  const winnerMatchNumber = compactWinnerPath?.[1] ?? winnerMatchPath?.[1];
  const loserMatchNumber = compactLoserPath?.[1] ?? loserMatchPath?.[1];

  if (winnerMatchNumber) {
    return { kind: "winner", matchNumber: winnerMatchNumber };
  }

  if (loserMatchNumber) {
    return { kind: "loser", matchNumber: loserMatchNumber };
  }

  return null;
}

function labelForTeam(
  teamId: string | null,
  placeholder: string | undefined,
  teamsById: Map<string, Team>,
) {
  if (teamId) {
    return teamsById.get(teamId)?.country ?? placeholder ?? "Team TBC";
  }

  return placeholder ?? "Team TBC";
}

function winnerPathLabel(label: string) {
  return label.replace(/^Winner of\s+/i, "");
}

function winnerTeamId(match: Match) {
  if (match.status !== "finished" || !match.winnerTeamId) {
    return null;
  }

  return match.winnerTeamId;
}

function resolveSlot(
  match: Match,
  slot: MatchSlot,
  matchesByNumber: Map<string, Match>,
  teamsById: Map<string, Team>,
): Partial<
  Pick<
    Match,
    "awayTeamId" | "awayTeamPlaceholder" | "homeTeamId" | "homeTeamPlaceholder"
  >
> {
  const teamId = slot === "home" ? match.homeTeamId : match.awayTeamId;
  const placeholder =
    slot === "home" ? match.homeTeamPlaceholder : match.awayTeamPlaceholder;
  const referencedPath = referencedMatchPath(placeholder);
  const sourceMatch =
    referencedPath?.kind === "winner"
      ? matchesByNumber.get(referencedPath.matchNumber)
    : undefined;

  if (!sourceMatch || teamId) {
    return {};
  }

  const resolvedWinnerTeamId = winnerTeamId(sourceMatch);

  if (resolvedWinnerTeamId) {
    return slot === "home"
      ? { homeTeamId: resolvedWinnerTeamId, homeTeamPlaceholder: undefined }
      : { awayTeamId: resolvedWinnerTeamId, awayTeamPlaceholder: undefined };
  }

  const homeLabel = labelForTeam(
    sourceMatch.homeTeamId,
    sourceMatch.homeTeamPlaceholder,
    teamsById,
  );
  const awayLabel = labelForTeam(
    sourceMatch.awayTeamId,
    sourceMatch.awayTeamPlaceholder,
    teamsById,
  );
  const clearerPlaceholder = `Winner of ${winnerPathLabel(
    homeLabel,
  )} / ${winnerPathLabel(awayLabel)}`;

  return slot === "home"
    ? { homeTeamPlaceholder: clearerPlaceholder }
    : { awayTeamPlaceholder: clearerPlaceholder };
}

// OpenFootball is a free static source, so future knockout fixtures can still
// contain winner-path placeholders after earlier results are known. This helper
// resolves only source-backed winners and leaves unresolved paths as readable
// placeholders.
export function resolveKnownKnockoutMatchups(matches: Match[], teams: Team[]) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const resolvedMatches: Match[] = [];
  const matchesByNumber = new Map<string, Match>();
  const winnerProgressionBySourceNumber = new Map<
    string,
    Pick<Match, "nextMatchId" | "nextMatchSlot">
  >();
  const loserProgressionBySourceNumber = new Map<
    string,
    Pick<Match, "nextMatchId" | "nextMatchSlot">
  >();

  for (const match of matches) {
    (["home", "away"] as const).forEach((slot) => {
      const placeholder =
        slot === "home" ? match.homeTeamPlaceholder : match.awayTeamPlaceholder;
      const reference = referencedMatchPath(placeholder);

      if (!reference) {
        return;
      }

      const progression = {
        nextMatchId: match.id,
        nextMatchSlot: slot,
      };

      if (reference.kind === "winner") {
        winnerProgressionBySourceNumber.set(reference.matchNumber, progression);
      } else {
        loserProgressionBySourceNumber.set(reference.matchNumber, progression);
      }
    });

    const resolvedMatch = {
      ...match,
      ...resolveSlot(match, "home", matchesByNumber, teamsById),
      ...resolveSlot(match, "away", matchesByNumber, teamsById),
    };
    const number = matchNumber(resolvedMatch);

    if (number) {
      matchesByNumber.set(number, resolvedMatch);
    }

    resolvedMatches.push(resolvedMatch);
  }

  const matchesByRound = resolvedMatches.reduce<Partial<Record<Match["round"], Match[]>>>(
    (groupedMatches, match) => {
      groupedMatches[match.round] = [...(groupedMatches[match.round] ?? []), match];
      return groupedMatches;
    },
    {},
  );

  return resolvedMatches.map((match) => {
    const number = matchNumber(match);
    const winnerProgression =
      number ? winnerProgressionBySourceNumber.get(number) : undefined;
    const loserProgression =
      number ? loserProgressionBySourceNumber.get(number) : undefined;
    const nextRound = nextKnockoutRound[match.round];
    const winnerTarget = nextRound
      ? matchesByRound[nextRound]?.find(
          (target) =>
            match.winnerTeamId &&
            (target.homeTeamId === match.winnerTeamId ||
              target.awayTeamId === match.winnerTeamId),
        )
      : undefined;
    const winnerTargetSlot: MatchSlot | null =
      winnerTarget?.homeTeamId === match.winnerTeamId
        ? "home"
        : winnerTarget?.awayTeamId === match.winnerTeamId
          ? "away"
          : null;
    const inferredWinnerProgression =
      winnerTarget && winnerTargetSlot
        ? {
            nextMatchId: winnerTarget.id,
            nextMatchSlot: winnerTargetSlot,
          }
        : undefined;

    // Winner paths define the main bracket tree. Loser paths are preserved only
    // for matches with no winner path, such as semi-finals feeding the separate
    // third-place match in local/sample sources.
    const progression =
      winnerProgression ??
      inferredWinnerProgression ??
      (match.nextMatchId ? undefined : loserProgression) ??
      undefined;

    return progression
      ? {
          ...match,
          ...progression,
        }
      : match;
  });
}
