import type { Match, Participant, Team } from "@/data/sweepstake";
import { createOpenFootballAdapter } from "@/lib/football/adapters/openFootball";

const teamNameAliases: Record<string, string> = {
  "czech republic": "czechia",
  "ir iran": "iran",
  "korea republic": "south korea",
  usa: "united states",
};

function normaliseName(name: string) {
  const normalisedName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return teamNameAliases[normalisedName] ?? normalisedName;
}

function teamLookupByName(sourceTeams: Team[]) {
  const lookup = new Map<string, Team>();

  for (const team of sourceTeams) {
    lookup.set(normaliseName(team.country), team);
  }

  return lookup;
}

function lostCompletedKnockoutMatch(team: Team, matches: Match[]) {
  return matches.some(
    (match) =>
      match.status === "finished" &&
      match.winnerTeamId !== null &&
      (match.homeTeamId === team.id || match.awayTeamId === team.id) &&
      match.winnerTeamId !== team.id,
  );
}

// Local/static status derivation only. OpenFootball is a free static source,
// not live official data, and this can later be replaced by a live sync layer.
export async function loadOpenFootballLeaderboardParticipants(
  participants: Participant[],
): Promise<Participant[]> {
  const result = await createOpenFootballAdapter().fetchWorldCupFixtures({
    season: 2026,
  });
  const knockoutMatches = result.matches.filter(
    (match) => match.round !== "group-stage",
  );
  const sourceTeamsByName = teamLookupByName(result.teams);

  return participants.map((participant) => ({
    ...participant,
    teams: participant.teams.map((team) => {
      const sourceTeam = sourceTeamsByName.get(normaliseName(team.country));
      const isEliminated = sourceTeam
        ? lostCompletedKnockoutMatch(sourceTeam, knockoutMatches)
        : false;

      return {
        ...team,
        status: isEliminated ? "eliminated" : "still-in",
      };
    }) as Participant["teams"],
  }));
}
