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

type ProgressionByNumber = Record<
  string,
  { nextMatchNumber: string; nextMatchSlot: MatchSlot }
>;

// OpenFootball has used both compact fixture numbers (97-104) and longer
// fixture IDs (53452525-53452539) for the 2026 knockout stage. These explicit
// edges prevent the visual bracket from guessing pairings from array order.
const worldCup2026WinnerProgressionByNumber: ProgressionByNumber = {
  "89": { nextMatchNumber: "97", nextMatchSlot: "home" },
  "90": { nextMatchNumber: "97", nextMatchSlot: "away" },
  "91": { nextMatchNumber: "99", nextMatchSlot: "home" },
  "92": { nextMatchNumber: "99", nextMatchSlot: "away" },
  "93": { nextMatchNumber: "98", nextMatchSlot: "home" },
  "94": { nextMatchNumber: "98", nextMatchSlot: "away" },
  "95": { nextMatchNumber: "100", nextMatchSlot: "home" },
  "96": { nextMatchNumber: "100", nextMatchSlot: "away" },
  "97": { nextMatchNumber: "101", nextMatchSlot: "home" },
  "98": { nextMatchNumber: "101", nextMatchSlot: "away" },
  "99": { nextMatchNumber: "102", nextMatchSlot: "home" },
  "100": { nextMatchNumber: "102", nextMatchSlot: "away" },
  "101": { nextMatchNumber: "104", nextMatchSlot: "home" },
  "102": { nextMatchNumber: "104", nextMatchSlot: "away" },
  "53452525": { nextMatchNumber: "53452533", nextMatchSlot: "home" },
  "53452527": { nextMatchNumber: "53452533", nextMatchSlot: "away" },
  "53452529": { nextMatchNumber: "53452535", nextMatchSlot: "home" },
  "53452531": { nextMatchNumber: "53452535", nextMatchSlot: "away" },
  "53452533": { nextMatchNumber: "53452537", nextMatchSlot: "home" },
  "53452535": { nextMatchNumber: "53452537", nextMatchSlot: "away" },
};

const worldCup2026LoserProgressionByNumber: ProgressionByNumber = {
  "101": { nextMatchNumber: "103", nextMatchSlot: "home" },
  "102": { nextMatchNumber: "103", nextMatchSlot: "away" },
  "53452533": { nextMatchNumber: "53452539", nextMatchSlot: "home" },
  "53452535": { nextMatchNumber: "53452539", nextMatchSlot: "away" },
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

function progressionFromNumber(
  progression: { nextMatchNumber: string; nextMatchSlot: MatchSlot } | undefined,
  matchesByNumber: Map<string, Match>,
): Pick<Match, "nextMatchId" | "nextMatchSlot"> | undefined {
  if (!progression) {
    return undefined;
  }

  const targetMatch = matchesByNumber.get(progression.nextMatchNumber);

  if (!targetMatch) {
    return undefined;
  }

  return {
    nextMatchId: targetMatch.id,
    nextMatchSlot: progression.nextMatchSlot,
  };
}

function loserProgressionFromNumber(
  progression: { nextMatchNumber: string; nextMatchSlot: MatchSlot } | undefined,
  matchesByNumber: Map<string, Match>,
): Pick<Match, "loserNextMatchId" | "loserNextMatchSlot"> | undefined {
  if (!progression) {
    return undefined;
  }

  const targetMatch = matchesByNumber.get(progression.nextMatchNumber);

  if (!targetMatch) {
    return undefined;
  }

  return {
    loserNextMatchId: targetMatch.id,
    loserNextMatchSlot: progression.nextMatchSlot,
  };
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
    const explicitWinnerProgression = number
      ? progressionFromNumber(
          worldCup2026WinnerProgressionByNumber[number],
          matchesByNumber,
        )
      : undefined;
    const explicitLoserProgression = number
      ? loserProgressionFromNumber(
          worldCup2026LoserProgressionByNumber[number],
          matchesByNumber,
        )
      : undefined;
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
      explicitWinnerProgression ??
      winnerProgression ??
      inferredWinnerProgression ??
      (match.nextMatchId ? undefined : loserProgression) ??
      undefined;

    return progression || explicitLoserProgression
      ? {
          ...match,
          ...(progression ?? {}),
          ...(explicitLoserProgression ?? {}),
        }
      : match;
  });
}

export function validateWorldCup2026KnockoutProgression(matches: Match[]) {
  const matchesByNumber = new Map<string, Match>();
  const errors: string[] = [];

  for (const match of matches) {
    const number = matchNumber(match);

    if (number) {
      matchesByNumber.set(number, match);
    }
  }

  const expectWinner = (
    sourceNumber: string,
    targetNumber: string,
    slot: MatchSlot,
  ) => {
    const source = matchesByNumber.get(sourceNumber);
    const target = matchesByNumber.get(targetNumber);

    if (!source || !target) {
      return;
    }

    if (source.nextMatchId !== target.id || source.nextMatchSlot !== slot) {
      errors.push(
        `${sourceNumber} should feed ${targetNumber} (${slot}), got ${source.nextMatchId ?? "none"} (${source.nextMatchSlot ?? "none"}).`,
      );
    }
  };

  const expectLoser = (
    sourceNumber: string,
    targetNumber: string,
    slot: MatchSlot,
  ) => {
    const source = matchesByNumber.get(sourceNumber);
    const target = matchesByNumber.get(targetNumber);

    if (!source || !target) {
      return;
    }

    if (
      source.loserNextMatchId !== target.id ||
      source.loserNextMatchSlot !== slot
    ) {
      errors.push(
        `${sourceNumber} loser should feed ${targetNumber} (${slot}), got ${source.loserNextMatchId ?? "none"} (${source.loserNextMatchSlot ?? "none"}).`,
      );
    }
  };

  const compactNumberSet = ["97", "98", "99", "100", "101", "102", "103", "104"];
  const longNumberSet = [
    "53452525",
    "53452527",
    "53452529",
    "53452531",
    "53452533",
    "53452535",
    "53452537",
    "53452539",
  ];
  const hasCompactNumbers = compactNumberSet.every((number) =>
    matchesByNumber.has(number),
  );
  const hasLongNumbers = longNumberSet.every((number) =>
    matchesByNumber.has(number),
  );

  if (hasCompactNumbers) {
    expectWinner("97", "101", "home");
    expectWinner("98", "101", "away");
    expectWinner("99", "102", "home");
    expectWinner("100", "102", "away");
    expectWinner("101", "104", "home");
    expectWinner("102", "104", "away");
    expectLoser("101", "103", "home");
    expectLoser("102", "103", "away");
  }

  if (hasLongNumbers) {
    expectWinner("53452525", "53452533", "home");
    expectWinner("53452527", "53452533", "away");
    expectWinner("53452529", "53452535", "home");
    expectWinner("53452531", "53452535", "away");
    expectWinner("53452533", "53452537", "home");
    expectWinner("53452535", "53452537", "away");
    expectLoser("53452533", "53452539", "home");
    expectLoser("53452535", "53452539", "away");
  }

  const franceMoroccoSemi = matchesByNumber.get("97")?.nextMatchId;
  const englandNorwaySemi = matchesByNumber.get("99")?.nextMatchId;

  if (
    franceMoroccoSemi &&
    englandNorwaySemi &&
    franceMoroccoSemi === englandNorwaySemi
  ) {
    errors.push("France/Morocco and Norway/England should not feed the same semi-final.");
  }

  return {
    errors,
    ok: errors.length === 0,
  };
}
