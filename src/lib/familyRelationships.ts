import type { SweepstakeRelationshipConfig } from "@/data/sweepstakes/types";

export type FamilyRelationshipType =
  | "custom-social"
  | "different-branch"
  | "fallback"
  | "parent-child"
  | "same-household"
  | "same-branch"
  | "sibling"
  | "spouse";

export type FamilyRelationshipInsight = {
  branchA?: string;
  branchB?: string;
  copy: string;
  label: string;
  priority: number;
  title: string;
  type: FamilyRelationshipType;
};

function pairMatches(a: string, b: string, pair: readonly [string, string]) {
  return (
    (pair[0] === a && pair[1] === b) ||
    (pair[0] === b && pair[1] === a)
  );
}

function sameGroup(a: string, b: string, groups: readonly string[][] = []) {
  return groups.some((group) => group.includes(a) && group.includes(b));
}

export function familyBranch(
  owner: string,
  relationships?: SweepstakeRelationshipConfig,
) {
  if (!relationships?.branches) {
    return undefined;
  }

  if (owner === "Nanaji") {
    return "Patriarch";
  }

  return Object.entries(relationships.branches).find(([, members]) =>
    members.includes(owner),
  )?.[0];
}

export function familyRelationshipInsight(
  ownerA: string,
  ownerB: string,
  relationships?: SweepstakeRelationshipConfig,
): FamilyRelationshipInsight {
  const branchA = familyBranch(ownerA, relationships);
  const branchB = familyBranch(ownerB, relationships);

  if (
    relationships?.spousePairs?.some((pair) =>
      pairMatches(ownerA, ownerB, pair),
    )
  ) {
    return {
      branchA,
      branchB,
      copy: "Marriage temporarily suspended for 90 minutes.",
      label: "HOMEWRECKER",
      priority: 0,
      title: "Family Feud",
      type: "spouse",
    };
  }

  const socialPair = relationships?.socialPairs?.find(({ pair }) =>
    pairMatches(ownerA, ownerB, pair),
  );

  if (socialPair) {
    return {
      branchA,
      branchB,
      copy: socialPair.copy,
      label: socialPair.label,
      priority: socialPair.priority,
      title: "Family Feud",
      type: "custom-social",
    };
  }

  if (
    relationships?.parentChildPairs?.some((pair) =>
      pairMatches(ownerA, ownerB, pair),
    )
  ) {
    return {
      branchA,
      branchB,
      copy: "Parent-child bragging rights are on the line.",
      label: "Parent vs child",
      priority: 1,
      title: "Family Feud",
      type: "parent-child",
    };
  }

  if (sameGroup(ownerA, ownerB, relationships?.households)) {
    return {
      branchA,
      branchB,
      copy: "Civil war in the household.",
      label: "Same household",
      priority: 2,
      title: "Family Feud",
      type: "same-household",
    };
  }

  if (sameGroup(ownerA, ownerB, relationships?.siblingGroups)) {
    return {
      branchA,
      branchB,
      copy: "Sibling rivalry has entered the chat.",
      label: "Sibling vs sibling",
      priority: 3,
      title: "Family Feud",
      type: "sibling",
    };
  }

  if (branchA && branchB && branchA === branchB && branchA !== "Patriarch") {
    return {
      branchA,
      branchB,
      copy: "Civil war in the family branch.",
      label: "Same branch",
      priority: 4,
      title: "Family Feud",
      type: "same-branch",
    };
  }

  if (branchA && branchB && branchA !== branchB) {
    return {
      branchA,
      branchB,
      copy: "Branch bragging rights loading.",
      label: "Branch vs branch",
      priority: 5,
      title: "Family Feud",
      type: "different-branch",
    };
  }

  return {
    branchA,
    branchB,
    copy: "Family bragging rights loading.",
    label: "Owned teams",
    priority: 6,
    title: "Family Feud",
    type: "fallback",
  };
}
