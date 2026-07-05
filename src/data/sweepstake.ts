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
  teamIds: [TeamId, TeamId];
};

export type Participant = {
  id: ParticipantId;
  name: string;
  teamIds: [TeamId, TeamId];
  teams: [AllocatedTeam, AllocatedTeam];
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

const participantRecords: Omit<Participant, "teamIds" | "teams">[] = [
  { id: "nanaji", name: "Nanaji" },
  { id: "mum", name: "Rita" },
  { id: "dad", name: "Bill" },
  { id: "ajay", name: "Ajay" },
  { id: "aditi", name: "Aditi" },
  { id: "ayesha", name: "Ayesha" },
  { id: "karan", name: "Karan" },
  { id: "mamaji", name: "Vijay" },
  { id: "mamiji", name: "Sunita" },
  { id: "priya", name: "Priya" },
  { id: "jij", name: "Steve" },
  { id: "simran", name: "Simran" },
  { id: "avi", name: "Avi" },
  { id: "arun", name: "Arun" },
  { id: "esha", name: "Esha" },
  { id: "sienna", name: "Sienna" },
  { id: "layla", name: "Layla" },
  { id: "masi", name: "Asha" },
  { id: "masard", name: "Yash" },
  { id: "kavita", name: "Kavita" },
  { id: "yaad", name: "Yaad" },
  { id: "veeran", name: "Veeran" },
  { id: "alisha", name: "Alisha" },
  { id: "rohan", name: "Rohan" },
];

export const allocations: Allocation[] = [
  { participantId: "nanaji", teamIds: ["canada", "dr-congo"] },
  { participantId: "mum", teamIds: ["haiti", "paraguay"] },
  { participantId: "dad", teamIds: ["morocco", "netherlands"] },
  { participantId: "ajay", teamIds: ["uruguay", "panama"] },
  { participantId: "aditi", teamIds: ["cape-verde", "switzerland"] },
  { participantId: "ayesha", teamIds: ["egypt", "senegal"] },
  { participantId: "karan", teamIds: ["ecuador", "tunisia"] },
  { participantId: "mamaji", teamIds: ["austria", "mexico"] },
  { participantId: "mamiji", teamIds: ["scotland", "england"] },
  { participantId: "priya", teamIds: ["south-africa", "japan"] },
  { participantId: "jij", teamIds: ["ivory-coast", "france"] },
  { participantId: "simran", teamIds: ["belgium", "curacao"] },
  { participantId: "avi", teamIds: ["sweden", "germany"] },
  { participantId: "arun", teamIds: ["croatia", "iran"] },
  { participantId: "esha", teamIds: ["saudi-arabia", "colombia"] },
  { participantId: "sienna", teamIds: ["ghana", "jordan"] },
  { participantId: "layla", teamIds: ["uzbekistan", "czechia"] },
  { participantId: "masi", teamIds: ["iraq", "qatar"] },
  { participantId: "masard", teamIds: ["argentina", "norway"] },
  { participantId: "kavita", teamIds: ["portugal", "bosnia-and-herzegovina"] },
  { participantId: "yaad", teamIds: ["brazil", "turkey"] },
  { participantId: "veeran", teamIds: ["united-states", "spain"] },
  { participantId: "alisha", teamIds: ["algeria", "south-korea"] },
  { participantId: "rohan", teamIds: ["new-zealand", "australia"] },
];

export function findOwnerOfTeam(teamId: TeamId | null) {
  if (!teamId) {
    return undefined;
  }

  const allocation = allocations.find(({ teamIds }) => teamIds.includes(teamId));
  const participant = participantRecords.find(
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
      .length as 0 | 1 | 2;
  }

  return participant.teamIds.filter((teamId) => isTeamStillIn(teamId, matches))
    .length as 0 | 1 | 2;
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

export const participants: Participant[] = participantRecords.map(
  (participant) => {
    const allocation = allocations.find(
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
      })) as [AllocatedTeam, AllocatedTeam],
    };
  },
);

export const sweepstakeSummary = {
  name: "Pizza Delicacia World Cup Sweepstake",
  playerCount: participants.length,
  teamCount: teams.length,
  entryFee: "£5",
  prizePot: "£120",
  format: "Last team standing",
  prizeSplit: "£100 first, £20 second",
};
