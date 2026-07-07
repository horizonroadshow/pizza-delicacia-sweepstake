import type { SweepstakeConfig } from "@/data/sweepstakes/types";

export type TeamId = string;
export type ParticipantId = string;
export type MatchId = string;

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed";

export type TournamentStage =
  | "group-stage"
  | "round-of-32"
  | "round-of-16"
  | "quarter-finals"
  | "semi-finals"
  | "final"
  | "third-place";

export type MatchSlot = "home" | "away";

export type TeamStatus = "still-in" | "eliminated";

export type Team = {
  country: string;
  flag: string;
  id: TeamId;
};

export type Allocation = {
  participantId: ParticipantId;
  teamIds: TeamId[];
};

export type Participant = {
  id: ParticipantId;
  name: string;
  teamIds: TeamId[];
  teams: AllocatedTeam[];
};

export type AllocatedTeam = Team & {
  status: TeamStatus;
};

export type Match = {
  awayScore: number | null;
  awayTeamId: TeamId | null;
  awayTeamPlaceholder?: string;
  homeScore: number | null;
  homeTeamId: TeamId | null;
  homeTeamPlaceholder?: string;
  id: MatchId;
  kickoffAt: string | null;
  loserNextMatchId?: MatchId | null;
  loserNextMatchSlot?: MatchSlot | null;
  nextMatchId: MatchId | null;
  nextMatchSlot: MatchSlot | null;
  round: TournamentStage;
  status: MatchStatus;
  winnerTeamId: TeamId | null;
};

export type Round = {
  id: TournamentStage;
  matches: Match[];
  name: string;
};

// Local sample data for the family sweepstake. These records are deliberately
// structured so they can later be populated or reconciled with a football API.
export const teams: Team[] = [
  { id: "canada", country: "Canada", flag: "🇨🇦" },
  { id: "dr-congo", country: "DR Congo", flag: "🇨🇩" },
  { id: "haiti", country: "Haiti", flag: "🇭🇹" },
  { id: "paraguay", country: "Paraguay", flag: "🇵🇾" },
  { id: "morocco", country: "Morocco", flag: "🇲🇦" },
  { id: "netherlands", country: "Netherlands", flag: "🇳🇱" },
  { id: "uruguay", country: "Uruguay", flag: "🇺🇾" },
  { id: "panama", country: "Panama", flag: "🇵🇦" },
  { id: "cape-verde", country: "Cape Verde", flag: "🇨🇻" },
  { id: "switzerland", country: "Switzerland", flag: "🇨🇭" },
  { id: "egypt", country: "Egypt", flag: "🇪🇬" },
  { id: "senegal", country: "Senegal", flag: "🇸🇳" },
  { id: "ecuador", country: "Ecuador", flag: "🇪🇨" },
  { id: "tunisia", country: "Tunisia", flag: "🇹🇳" },
  { id: "austria", country: "Austria", flag: "🇦🇹" },
  { id: "mexico", country: "Mexico", flag: "🇲🇽" },
  { id: "scotland", country: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "england", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "south-africa", country: "South Africa", flag: "🇿🇦" },
  { id: "japan", country: "Japan", flag: "🇯🇵" },
  { id: "ivory-coast", country: "Ivory Coast", flag: "🇨🇮" },
  { id: "france", country: "France", flag: "🇫🇷" },
  { id: "belgium", country: "Belgium", flag: "🇧🇪" },
  { id: "curacao", country: "Curaçao", flag: "🇨🇼" },
  { id: "sweden", country: "Sweden", flag: "🇸🇪" },
  { id: "germany", country: "Germany", flag: "🇩🇪" },
  { id: "croatia", country: "Croatia", flag: "🇭🇷" },
  { id: "iran", country: "Iran", flag: "🇮🇷" },
  { id: "saudi-arabia", country: "Saudi Arabia", flag: "🇸🇦" },
  { id: "colombia", country: "Colombia", flag: "🇨🇴" },
  { id: "ghana", country: "Ghana", flag: "🇬🇭" },
  { id: "jordan", country: "Jordan", flag: "🇯🇴" },
  { id: "uzbekistan", country: "Uzbekistan", flag: "🇺🇿" },
  { id: "czechia", country: "Czechia", flag: "🇨🇿" },
  { id: "iraq", country: "Iraq", flag: "🇮🇶" },
  { id: "qatar", country: "Qatar", flag: "🇶🇦" },
  { id: "argentina", country: "Argentina", flag: "🇦🇷" },
  { id: "norway", country: "Norway", flag: "🇳🇴" },
  { id: "portugal", country: "Portugal", flag: "🇵🇹" },
  {
    id: "bosnia-and-herzegovina",
    country: "Bosnia and Herzegovina",
    flag: "🇧🇦",
  },
  { id: "brazil", country: "Brazil", flag: "🇧🇷" },
  { id: "turkey", country: "Turkey", flag: "🇹🇷" },
  { id: "united-states", country: "United States", flag: "🇺🇸" },
  { id: "spain", country: "Spain", flag: "🇪🇸" },
  { id: "algeria", country: "Algeria", flag: "🇩🇿" },
  { id: "south-korea", country: "South Korea", flag: "🇰🇷" },
  { id: "new-zealand", country: "New Zealand", flag: "🇳🇿" },
  { id: "australia", country: "Australia", flag: "🇦🇺" },
];

export function findOwnerOfTeam(
  teamId: TeamId | null,
  config?: SweepstakeConfig,
) {
  if (!teamId) {
    return undefined;
  }

  const allocation = config?.allocations.find(({ teamIds }) =>
    teamIds.includes(teamId),
  );
  const participant = config?.participants.find(
    ({ id }) => id === allocation?.participantId,
  );

  return participant?.name;
}

export function isTeamStillIn(teamId: TeamId | null, matches: Match[] = []) {
  if (!teamId) {
    return false;
  }

  return !matches.some(
    (match) =>
      match.status === "finished" &&
      (match.homeTeamId === teamId || match.awayTeamId === teamId) &&
      match.winnerTeamId !== teamId,
  );
}

export function countParticipantTeamsRemaining(
  participant: Pick<Participant, "teamIds"> & Partial<Pick<Participant, "teams">>,
  matches: Match[] = [],
) {
  if (matches.length === 0 && participant.teams) {
    return participant.teams.filter((team) => team.status === "still-in")
      .length;
  }

  return participant.teamIds.filter((teamId) => isTeamStillIn(teamId, matches))
    .length;
}

export function groupMatchesByRound(matches: Match[]) {
  return matches.reduce<Record<TournamentStage, Match[]>>(
    (groupedMatches, match) => {
      groupedMatches[match.round].push(match);
      return groupedMatches;
    },
    {
      "group-stage": [],
      "round-of-32": [],
      "round-of-16": [],
      "quarter-finals": [],
      "semi-finals": [],
      final: [],
      "third-place": [],
    },
  );
}

function getTeam(teamId: TeamId) {
  const team = teams.find(({ id }) => id === teamId);

  if (!team) {
    throw new Error(`Unknown team id: ${teamId}`);
  }

  return team;
}

export function createParticipants(config: SweepstakeConfig): Participant[] {
  return config.participants.map((participant) => {
    const allocation = config.allocations.find(
      ({ participantId }) => participantId === participant.id,
    );

    if (!allocation) {
      throw new Error(`Missing allocation for ${participant.name}`);
    }

    return {
      ...participant,
      teamIds: allocation.teamIds,
      teams: allocation.teamIds.map((teamId) => ({
        ...getTeam(teamId),
        status: isTeamStillIn(teamId) ? "still-in" : "eliminated",
      })),
    };
  });
}

export function createSweepstakeSummary(
  config: SweepstakeConfig,
  sweepstakeParticipants: Participant[],
) {
  return {
    entryFee: config.entryFee,
    format: "Last team standing",
    name: config.name,
    playerCount: sweepstakeParticipants.length,
    prizePot: config.totalPrizePot,
    prizeSplit: config.prizeSplit.summary,
    teamCount: sweepstakeParticipants.reduce(
      (total, participant) => total + participant.teamIds.length,
      0,
    ),
    teamsPerParticipant: config.teamsPerParticipant,
  };
}
