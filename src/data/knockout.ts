import type {
  Match,
  MatchId,
  MatchSlot,
  Participant,
  Team,
  TeamId,
  TournamentStage,
} from "@/data/sweepstake";
import { findOwnerOfTeam, groupMatchesByRound, teams } from "@/data/sweepstake";

export type KnockoutTeam = {
  flag: string;
  id: TeamId | null;
  label: string;
  owner: string;
  state: "pending" | "winner" | "eliminated";
};

export type KnockoutMatch = Match & {
  dateTimeLabel: string;
  eliminatedLabel: string;
  home: KnockoutTeam;
  away: KnockoutTeam;
  label: string;
  scoreLabel: string;
  statusLabel: string;
  winnerLabel: string;
};

export type KnockoutRound = {
  id: string;
  matches: KnockoutMatch[];
  name: string;
  side: "left" | "right";
};

export type KnockoutDraw = {
  leftRounds: KnockoutRound[];
  final: KnockoutMatch;
  thirdPlace?: KnockoutMatch;
  rightRounds: KnockoutRound[];
};

const roundNames: Record<TournamentStage, string> = {
  "group-stage": "Group stage",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  "quarter-finals": "Quarter-finals",
  "semi-finals": "Semi-finals",
  final: "Final",
  "third-place": "Third-place match",
};

const matchLabels: Record<MatchId, string> = {
  m1: "Match 1",
  m2: "Match 2",
  m3: "Match 3",
  m4: "Match 4",
  m5: "Match 5",
  m6: "Match 6",
  m7: "Match 7",
  m8: "Match 8",
  m9: "Match 9",
  m10: "Match 10",
  m11: "Match 11",
  m12: "Match 12",
  m13: "Match 13",
  m14: "Match 14",
  m15: "Match 15",
  m16: "Match 16",
  m17: "Final",
  m18: "Third-place match",
};

type KnockoutDrawOptions = {
  participants?: Participant[];
  teams?: Team[];
};

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

function ownerLookup(participants: Participant[] = []) {
  const lookup = new Map<string, string>();

  for (const participant of participants) {
    for (const team of participant.teams) {
      lookup.set(normaliseName(team.country), participant.name);
    }
  }

  return lookup;
}

function flagLookup(participants: Participant[] = []) {
  const lookup = new Map<string, string>();

  for (const participant of participants) {
    for (const team of participant.teams) {
      lookup.set(normaliseName(team.country), team.flag);
    }
  }

  return lookup;
}

// Local sample bracket data only. These match records intentionally mirror the
// fields a live football API is likely to provide later, without inventing real
// World Cup fixtures or results.
export const knockoutMatches: Match[] = [
  {
    id: "m1",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team A",
    awayTeamPlaceholder: "Team B",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m9",
    nextMatchSlot: "home",
  },
  {
    id: "m2",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team C",
    awayTeamPlaceholder: "Team D",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m9",
    nextMatchSlot: "away",
  },
  {
    id: "m3",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team E",
    awayTeamPlaceholder: "Team F",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m10",
    nextMatchSlot: "home",
  },
  {
    id: "m4",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team G",
    awayTeamPlaceholder: "Team H",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m10",
    nextMatchSlot: "away",
  },
  {
    id: "m5",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team I",
    awayTeamPlaceholder: "Team J",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m11",
    nextMatchSlot: "home",
  },
  {
    id: "m6",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team K",
    awayTeamPlaceholder: "Team L",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m11",
    nextMatchSlot: "away",
  },
  {
    id: "m7",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team M",
    awayTeamPlaceholder: "Team N",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m12",
    nextMatchSlot: "home",
  },
  {
    id: "m8",
    round: "round-of-32",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Team O",
    awayTeamPlaceholder: "Team P",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m12",
    nextMatchSlot: "away",
  },
  {
    id: "m9",
    round: "round-of-16",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 1",
    awayTeamPlaceholder: "Winner Match 2",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m13",
    nextMatchSlot: "home",
  },
  {
    id: "m10",
    round: "round-of-16",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 3",
    awayTeamPlaceholder: "Winner Match 4",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m13",
    nextMatchSlot: "away",
  },
  {
    id: "m11",
    round: "round-of-16",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 5",
    awayTeamPlaceholder: "Winner Match 6",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m14",
    nextMatchSlot: "home",
  },
  {
    id: "m12",
    round: "round-of-16",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 7",
    awayTeamPlaceholder: "Winner Match 8",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m14",
    nextMatchSlot: "away",
  },
  {
    id: "m13",
    round: "quarter-finals",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 9",
    awayTeamPlaceholder: "Winner Match 10",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m15",
    nextMatchSlot: "home",
  },
  {
    id: "m14",
    round: "quarter-finals",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 11",
    awayTeamPlaceholder: "Winner Match 12",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m15",
    nextMatchSlot: "away",
  },
  {
    id: "m15",
    round: "semi-finals",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 13",
    awayTeamPlaceholder: "Winner Match 14",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m17",
    nextMatchSlot: "home",
  },
  {
    id: "m16",
    round: "semi-finals",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 11",
    awayTeamPlaceholder: "Winner Match 12",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: "m17",
    nextMatchSlot: "away",
  },
  {
    id: "m17",
    round: "final",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Winner Match 15",
    awayTeamPlaceholder: "Winner Match 16",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: null,
    nextMatchSlot: null,
  },
  {
    id: "m18",
    round: "third-place",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamPlaceholder: "Runner-up Match 15",
    awayTeamPlaceholder: "Runner-up Match 16",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    nextMatchId: null,
    nextMatchSlot: null,
  },
];

function findTeam(teamId: TeamId | null, sourceTeams: Team[]) {
  return sourceTeams.find(({ id }) => id === teamId);
}

function dateTimeLabel(match: Match) {
  if (!match.kickoffAt) {
    return match.round === "final"
      ? "Final date and time TBC"
      : "Date and time TBC";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(match.kickoffAt));
}

function scoreLabel(match: Match) {
  if (match.homeScore === null || match.awayScore === null) {
    return "Score TBC";
  }

  return `${match.homeScore}-${match.awayScore}`;
}

function teamState(match: Match, teamId: TeamId | null): KnockoutTeam["state"] {
  void match;
  void teamId;

  return "pending";
}

function statusLabel(match: Match) {
  const labels: Record<Match["status"], string> = {
    finished: "Finished",
    live: "Live",
    postponed: "TBD",
    scheduled: "Scheduled",
  };

  return labels[match.status];
}

function resolveMatchTeam(
  match: Match,
  slot: MatchSlot,
  options: Required<KnockoutDrawOptions>,
): KnockoutTeam {
  const teamId = slot === "home" ? match.homeTeamId : match.awayTeamId;
  const placeholder =
    slot === "home" ? match.homeTeamPlaceholder : match.awayTeamPlaceholder;
  const team = findTeam(teamId, options.teams);
  const normalisedTeamName = team ? normaliseName(team.country) : undefined;
  const ownersByTeamName = ownerLookup(options.participants);
  const flagsByTeamName = flagLookup(options.participants);

  return {
    flag:
      (normalisedTeamName ? flagsByTeamName.get(normalisedTeamName) : undefined) ??
      team?.flag ??
      "◇",
    id: team?.id ?? null,
    label: team?.country ?? placeholder ?? "Team TBC",
    owner:
      (normalisedTeamName ? ownersByTeamName.get(normalisedTeamName) : undefined) ??
      (team ? findOwnerOfTeam(team.id) : undefined) ??
      "Family owner TBC",
    state: teamState(match, team?.id ?? null),
  };
}

function resolveWinnerLabel(match: Match, sourceTeams: Team[]) {
  if (!match.winnerTeamId) {
    return "Winner TBC";
  }

  return findTeam(match.winnerTeamId, sourceTeams)?.country ?? "Winner TBC";
}

function toKnockoutMatch(
  match: Match,
  options: Required<KnockoutDrawOptions>,
): KnockoutMatch {
  return {
    ...match,
    away: resolveMatchTeam(match, "away", options),
    dateTimeLabel: dateTimeLabel(match),
    eliminatedLabel: match.status === "finished" ? "Eliminated" : "Eliminated TBC",
    home: resolveMatchTeam(match, "home", options),
    label: matchLabels[match.id] ?? roundNames[match.round],
    scoreLabel: scoreLabel(match),
    statusLabel: statusLabel(match),
    winnerLabel: resolveWinnerLabel(match, options.teams),
  };
}

function round(
  id: string,
  name: string,
  side: "left" | "right",
  matches: Match[],
  options: Required<KnockoutDrawOptions>,
): KnockoutRound {
  return {
    id,
    matches: matches.map((match) => toKnockoutMatch(match, options)),
    name,
    side,
  };
}

export function createKnockoutDraw(
  matches: Match[],
  options: KnockoutDrawOptions = {},
): KnockoutDraw {
  const drawOptions: Required<KnockoutDrawOptions> = {
    participants: options.participants ?? [],
    teams: [...teams, ...(options.teams ?? [])],
  };
  const groupedMatches = groupMatchesByRound(matches);
  const roundOf32 = groupedMatches["round-of-32"];
  const roundOf16 = groupedMatches["round-of-16"];
  const quarterFinals = groupedMatches["quarter-finals"];
  const semiFinals = groupedMatches["semi-finals"];
  const final = groupedMatches.final[0];
  const thirdPlace = groupedMatches["third-place"][0];

  if (!final) {
    throw new Error("Sample knockout data is missing the final.");
  }

  return {
    leftRounds: [
      round(
        "left-round-of-32",
        roundNames["round-of-32"],
        "left",
        roundOf32.slice(0, 4),
        drawOptions,
      ),
      round(
        "left-round-of-16",
        roundNames["round-of-16"],
        "left",
        roundOf16.slice(0, 2),
        drawOptions,
      ),
      round(
        "left-quarter-finals",
        roundNames["quarter-finals"],
        "left",
        quarterFinals.slice(0, 1),
        drawOptions,
      ),
      round(
        "left-semi-finals",
        roundNames["semi-finals"],
        "left",
        semiFinals.slice(0, 1),
        drawOptions,
      ),
    ],
    final: toKnockoutMatch(final, drawOptions),
    thirdPlace: thirdPlace ? toKnockoutMatch(thirdPlace, drawOptions) : undefined,
    rightRounds: [
      round(
        "right-semi-finals",
        roundNames["semi-finals"],
        "right",
        semiFinals.slice(1, 2),
        drawOptions,
      ),
      round(
        "right-quarter-finals",
        roundNames["quarter-finals"],
        "right",
        quarterFinals.slice(1, 2),
        drawOptions,
      ),
      round(
        "right-round-of-16",
        roundNames["round-of-16"],
        "right",
        roundOf16.slice(2, 4),
        drawOptions,
      ),
      round(
        "right-round-of-32",
        roundNames["round-of-32"],
        "right",
        roundOf32.slice(4, 8),
        drawOptions,
      ),
    ],
  };
}

export const knockoutDraw = createKnockoutDraw(knockoutMatches);
