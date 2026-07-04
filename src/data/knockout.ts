export type TeamState = "pending" | "winner" | "eliminated";

export type KnockoutTeam = {
  label: string;
  flag: string;
  owner: string;
  state: TeamState;
};

export type KnockoutMatch = {
  id: string;
  label: string;
  dateTimeLabel: string;
  home: KnockoutTeam;
  away: KnockoutTeam;
  scoreLabel: string;
  winnerLabel: string;
  eliminatedLabel: string;
};

export type KnockoutRound = {
  id: string;
  name: string;
  side: "left" | "right";
  matches: KnockoutMatch[];
};

export type KnockoutDraw = {
  leftRounds: KnockoutRound[];
  final: KnockoutMatch;
  thirdPlace?: KnockoutMatch;
  rightRounds: KnockoutRound[];
};

const placeholderTeam = (label: string): KnockoutTeam => ({
  label,
  flag: "◇",
  owner: "Family owner TBC",
  state: "pending",
});

const placeholderMatch = (
  id: string,
  label: string,
  home: string,
  away: string,
  dateTimeLabel = "Date and time TBC",
): KnockoutMatch => ({
  id,
  label,
  dateTimeLabel,
  home: placeholderTeam(home),
  away: placeholderTeam(away),
  scoreLabel: "Score TBC",
  winnerLabel: "Winner TBC",
  eliminatedLabel: "Eliminated TBC",
});

export const knockoutDraw: KnockoutDraw = {
  leftRounds: [
    {
      id: "left-round-of-32",
      name: "Round of 32",
      side: "left",
      matches: [
        placeholderMatch("m1", "Match 1", "Team A", "Team B"),
        placeholderMatch("m2", "Match 2", "Team C", "Team D"),
        placeholderMatch("m3", "Match 3", "Team E", "Team F"),
        placeholderMatch("m4", "Match 4", "Team G", "Team H"),
      ],
    },
    {
      id: "left-round-of-16",
      name: "Round of 16",
      side: "left",
      matches: [
        placeholderMatch("m9", "Match 9", "Winner Match 1", "Winner Match 2"),
        placeholderMatch(
          "m10",
          "Match 10",
          "Winner Match 3",
          "Winner Match 4",
        ),
      ],
    },
    {
      id: "left-quarter-finals",
      name: "Quarter-finals",
      side: "left",
      matches: [
        placeholderMatch(
          "m13",
          "Match 13",
          "Winner Match 9",
          "Winner Match 10",
        ),
      ],
    },
    {
      id: "left-semi-finals",
      name: "Semi-finals",
      side: "left",
      matches: [
        placeholderMatch(
          "m15",
          "Match 15",
          "Winner Match 13",
          "Winner Match 14",
        ),
      ],
    },
  ],
  final: placeholderMatch(
    "m17",
    "Final",
    "Winner Match 15",
    "Winner Match 16",
    "Final date and time TBC",
  ),
  thirdPlace: placeholderMatch(
    "m18",
    "Third-place match",
    "Runner-up Match 15",
    "Runner-up Match 16",
    "Date and time TBC",
  ),
  rightRounds: [
    {
      id: "right-semi-finals",
      name: "Semi-finals",
      side: "right",
      matches: [
        placeholderMatch(
          "m16",
          "Match 16",
          "Winner Match 11",
          "Winner Match 12",
        ),
      ],
    },
    {
      id: "right-quarter-finals",
      name: "Quarter-finals",
      side: "right",
      matches: [
        placeholderMatch(
          "m14",
          "Match 14",
          "Winner Match 11",
          "Winner Match 12",
        ),
      ],
    },
    {
      id: "right-round-of-16",
      name: "Round of 16",
      side: "right",
      matches: [
        placeholderMatch(
          "m11",
          "Match 11",
          "Winner Match 5",
          "Winner Match 6",
        ),
        placeholderMatch(
          "m12",
          "Match 12",
          "Winner Match 7",
          "Winner Match 8",
        ),
      ],
    },
    {
      id: "right-round-of-32",
      name: "Round of 32",
      side: "right",
      matches: [
        placeholderMatch("m5", "Match 5", "Team I", "Team J"),
        placeholderMatch("m6", "Match 6", "Team K", "Team L"),
        placeholderMatch("m7", "Match 7", "Team M", "Team N"),
        placeholderMatch("m8", "Match 8", "Team O", "Team P"),
      ],
    },
  ],
};
