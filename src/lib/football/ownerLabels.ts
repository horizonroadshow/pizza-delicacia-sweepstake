import type { Participant } from "@/data/sweepstake";

const teamNameAliases: Record<string, string> = {
  "bosnia herzegovina": "bosnia and herzegovina",
  "congo dr": "dr congo",
  "cote d ivoire": "ivory coast",
  "czech republic": "czechia",
  "democratic republic of congo": "dr congo",
  "ir iran": "iran",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "u s a": "united states",
  us: "united states",
  usa: "united states",
  "united states of america": "united states",
};

export function normaliseTeamName(name: string) {
  const normalisedName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return teamNameAliases[normalisedName] ?? normalisedName;
}

export function ownerLookup(participants: Participant[]) {
  const lookup = new Map<string, string>();

  for (const participant of participants) {
    for (const team of participant.teams) {
      lookup.set(normaliseTeamName(team.country), participant.name);
    }
  }

  return lookup;
}

function conciseOwnerList(owners: string[]) {
  const uniqueOwners = Array.from(new Set(owners));

  if (uniqueOwners.length === 0) {
    return "TBC";
  }

  if (uniqueOwners.length === 1) {
    return `Owner: ${uniqueOwners[0]}`;
  }

  if (uniqueOwners.length === 2) {
    return `${uniqueOwners[0]} or ${uniqueOwners[1]}`;
  }

  return `${uniqueOwners.slice(0, -1).join(", ")} or ${
    uniqueOwners[uniqueOwners.length - 1]
  }`;
}

function possibleTeamNames(label: string) {
  return label
    .replace(/^Winner of\s+/i, "")
    .split(/\s+\/\s+/)
    .map((teamName) => teamName.replace(/^Winner of\s+/i, "").trim())
    .filter(Boolean);
}

export function possibleOwnerLabel(
  placeholder: string | undefined,
  participants: Participant[],
) {
  if (!placeholder || /^(Team TBC|TBC|TBD|TBA)$/i.test(placeholder.trim())) {
    return "TBC";
  }

  const ownersByTeamName = ownerLookup(participants);
  const owners: string[] = [];
  let hasUnknownCandidate = false;

  for (const teamName of possibleTeamNames(placeholder)) {
    if (/^(Winner Match \d+|W\d+)$/i.test(teamName)) {
      hasUnknownCandidate = true;
      continue;
    }

    const owner = ownersByTeamName.get(normaliseTeamName(teamName));

    if (owner) {
      owners.push(owner);
    } else {
      hasUnknownCandidate = true;
    }
  }

  if (owners.length === 0) {
    return "TBC";
  }

  if (hasUnknownCandidate) {
    owners.push("TBC");
  }

  return conciseOwnerList(owners);
}
