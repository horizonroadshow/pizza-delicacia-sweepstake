export type TeamStatus = "still-in" | "eliminated";

export type Team = {
  country: string;
  flag: string;
  status: TeamStatus;
};

export type Participant = {
  name: string;
  teams: [Team, Team];
};

const stillIn = "still-in" satisfies TeamStatus;

export const participants: Participant[] = [
  {
    name: "Nanaji",
    teams: [
      { country: "Canada", flag: "🇨🇦", status: stillIn },
      { country: "DR Congo", flag: "🇨🇩", status: stillIn },
    ],
  },
  {
    name: "Mum",
    teams: [
      { country: "Haiti", flag: "🇭🇹", status: stillIn },
      { country: "Paraguay", flag: "🇵🇾", status: stillIn },
    ],
  },
  {
    name: "Dad",
    teams: [
      { country: "Morocco", flag: "🇲🇦", status: stillIn },
      { country: "Netherlands", flag: "🇳🇱", status: stillIn },
    ],
  },
  {
    name: "Ajay",
    teams: [
      { country: "Uruguay", flag: "🇺🇾", status: stillIn },
      { country: "Panama", flag: "🇵🇦", status: stillIn },
    ],
  },
  {
    name: "Aditi",
    teams: [
      { country: "Cape Verde", flag: "🇨🇻", status: stillIn },
      { country: "Switzerland", flag: "🇨🇭", status: stillIn },
    ],
  },
  {
    name: "Ayesha",
    teams: [
      { country: "Egypt", flag: "🇪🇬", status: stillIn },
      { country: "Senegal", flag: "🇸🇳", status: stillIn },
    ],
  },
  {
    name: "Karan",
    teams: [
      { country: "Ecuador", flag: "🇪🇨", status: stillIn },
      { country: "Tunisia", flag: "🇹🇳", status: stillIn },
    ],
  },
  {
    name: "Mamaji",
    teams: [
      { country: "Austria", flag: "🇦🇹", status: stillIn },
      { country: "Mexico", flag: "🇲🇽", status: stillIn },
    ],
  },
  {
    name: "Mamiji",
    teams: [
      { country: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", status: stillIn },
      { country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", status: stillIn },
    ],
  },
  {
    name: "Priya",
    teams: [
      { country: "South Africa", flag: "🇿🇦", status: stillIn },
      { country: "Japan", flag: "🇯🇵", status: stillIn },
    ],
  },
  {
    name: "Jij",
    teams: [
      { country: "Ivory Coast", flag: "🇨🇮", status: stillIn },
      { country: "France", flag: "🇫🇷", status: stillIn },
    ],
  },
  {
    name: "Simran",
    teams: [
      { country: "Belgium", flag: "🇧🇪", status: stillIn },
      { country: "Curaçao", flag: "🇨🇼", status: stillIn },
    ],
  },
  {
    name: "Avi",
    teams: [
      { country: "Sweden", flag: "🇸🇪", status: stillIn },
      { country: "Germany", flag: "🇩🇪", status: stillIn },
    ],
  },
  {
    name: "Arun",
    teams: [
      { country: "Croatia", flag: "🇭🇷", status: stillIn },
      { country: "Iran", flag: "🇮🇷", status: stillIn },
    ],
  },
  {
    name: "Esha",
    teams: [
      { country: "Saudi Arabia", flag: "🇸🇦", status: stillIn },
      { country: "Colombia", flag: "🇨🇴", status: stillIn },
    ],
  },
  {
    name: "Sienna",
    teams: [
      { country: "Ghana", flag: "🇬🇭", status: stillIn },
      { country: "Jordan", flag: "🇯🇴", status: stillIn },
    ],
  },
  {
    name: "Layla",
    teams: [
      { country: "Uzbekistan", flag: "🇺🇿", status: stillIn },
      { country: "Czechia", flag: "🇨🇿", status: stillIn },
    ],
  },
  {
    name: "Masi",
    teams: [
      { country: "Iraq", flag: "🇮🇶", status: stillIn },
      { country: "Qatar", flag: "🇶🇦", status: stillIn },
    ],
  },
  {
    name: "Masard",
    teams: [
      { country: "Argentina", flag: "🇦🇷", status: stillIn },
      { country: "Norway", flag: "🇳🇴", status: stillIn },
    ],
  },
  {
    name: "Kavita",
    teams: [
      { country: "Portugal", flag: "🇵🇹", status: stillIn },
      { country: "Bosnia and Herzegovina", flag: "🇧🇦", status: stillIn },
    ],
  },
  {
    name: "Yaad",
    teams: [
      { country: "Brazil", flag: "🇧🇷", status: stillIn },
      { country: "Turkey", flag: "🇹🇷", status: stillIn },
    ],
  },
  {
    name: "Veeran",
    teams: [
      { country: "United States", flag: "🇺🇸", status: stillIn },
      { country: "Spain", flag: "🇪🇸", status: stillIn },
    ],
  },
  {
    name: "Alisha",
    teams: [
      { country: "Algeria", flag: "🇩🇿", status: stillIn },
      { country: "South Korea", flag: "🇰🇷", status: stillIn },
    ],
  },
  {
    name: "Rohan",
    teams: [
      { country: "New Zealand", flag: "🇳🇿", status: stillIn },
      { country: "Australia", flag: "🇦🇺", status: stillIn },
    ],
  },
];

export const sweepstakeSummary = {
  name: "Pizza Delicacia World Cup Sweepstake",
  playerCount: participants.length,
  teamCount: participants.length * 2,
  entryFee: "£5",
  prizePot: "£120",
  format: "Last team standing",
  prizeSplit: "TBC",
};
