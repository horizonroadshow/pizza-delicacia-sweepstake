import type { Match, MatchSlot, Team } from "@/data/sweepstake";

function matchNumber(match: Match) {
  const numberMatch = /\d+$/.exec(match.id);

  return numberMatch?.[0];
}

function referencedMatchNumber(placeholder: string | undefined) {
  if (!placeholder) {
    return null;
  }

  const normalisedPlaceholder = placeholder.trim();
  const compactWinnerPath = /^W(\d+)$/i.exec(normalisedPlaceholder);
  const winnerMatchPath = /^Winner(?:\s+of)?\s+Match\s+(\d+)$/i.exec(
    normalisedPlaceholder,
  );

  return compactWinnerPath?.[1] ?? winnerMatchPath?.[1] ?? null;
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
  const referencedNumber = referencedMatchNumber(placeholder);
  const sourceMatch = referencedNumber
    ? matchesByNumber.get(referencedNumber)
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

  for (const match of matches) {
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

  return resolvedMatches;
}
