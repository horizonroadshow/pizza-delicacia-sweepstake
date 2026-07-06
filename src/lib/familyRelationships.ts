import type { SweepstakeRelationshipConfig } from "@/data/sweepstakes/types";

export type FamilyRelationshipType =
  | "custom-social"
  | "cousin"
  | "different-branch"
  | "fallback"
  | "older-sibling"
  | "parent-child"
  | "same-household"
  | "same-branch"
  | "sibling"
  | "spouse"
  | "young-child";

export type FamilyRelationshipInsight = {
  branchA?: string;
  branchB?: string;
  copy: string;
  label: string;
  priority: number;
  socialType?: string;
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

function includesEither(a: string, b: string, members: readonly string[] = []) {
  return members.includes(a) || members.includes(b);
}

function relationshipCopy(
  relationships: SweepstakeRelationshipConfig | undefined,
  type: NonNullable<SweepstakeRelationshipConfig["relationshipCopy"]> extends infer Copy
    ? keyof NonNullable<Copy>
    : never,
  defaults: { copy: string; label: string; title?: string },
) {
  return {
    ...defaults,
    ...(relationships?.relationshipCopy?.[type] ?? {}),
  };
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
  const relationshipTitle = relationships?.title ?? "Family Feud";
  const genericCopy =
    relationships?.genericBraggingRightsCopy ?? "Family bragging rights loading.";

  if (
    relationships?.spousePairs?.some((pair) =>
      pairMatches(ownerA, ownerB, pair),
    )
  ) {
    const copy = relationshipCopy(relationships, "spouse", {
      copy: "Marriage temporarily suspended for 90 minutes.",
      label: "HOMEWRECKER",
    });

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: 0,
      title: copy.title ?? relationshipTitle,
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
      socialType: socialPair.type,
      title: relationshipTitle,
      type: "custom-social",
    };
  }

  if (
    relationships?.parentChildPairs?.some((pair) =>
      pairMatches(ownerA, ownerB, pair),
    )
  ) {
    const copy = relationshipCopy(relationships, "parent-child", {
      copy: "Parent-child bragging rights are on the line.",
      label: "Parent vs child",
    });

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: 1,
      title: copy.title ?? relationshipTitle,
      type: "parent-child",
    };
  }

  const hasChildEntry = includesEither(
    ownerA,
    ownerB,
    relationships?.generationGroups?.child,
  );

  if (hasChildEntry) {
    const bothChildEntries = [
      ownerA,
      ownerB,
    ].every((owner) => relationships?.generationGroups?.child?.includes(owner));
    const copy = relationshipCopy(relationships, "young-child", {
      copy: "The grown-ups may never hear the end of this.",
      label: "Next Generation",
    });

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: bothChildEntries ? 2 : 5,
      title: copy.title ?? relationshipTitle,
      type: "young-child",
    };
  }

  if (sameGroup(ownerA, ownerB, relationships?.households)) {
    const copy = relationshipCopy(relationships, "same-household", {
      copy: "Civil war in the household.",
      label: "Same household",
    });

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: 3,
      title: copy.title ?? relationshipTitle,
      type: "same-household",
    };
  }

  if (sameGroup(ownerA, ownerB, relationships?.siblingGroups)) {
    const isOlderSiblingMatch = sameGroup(ownerA, ownerB, [
      relationships?.generationGroups?.olderSibling ?? [],
    ]);
    const copy = relationshipCopy(
      relationships,
      isOlderSiblingMatch ? "older-sibling" : "sibling",
      isOlderSiblingMatch
        ? {
            copy: "Sibling bragging rights, 60 years in the making.",
            label: "Sibling Bragging Rights",
          }
        : {
            copy: "Sibling rivalry has entered the chat.",
            label: "Sibling vs sibling",
          },
    );

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: 4,
      title: copy.title ?? relationshipTitle,
      type: isOlderSiblingMatch ? "older-sibling" : "sibling",
    };
  }

  if (sameGroup(ownerA, ownerB, relationships?.cousinGroups)) {
    const copy = relationshipCopy(relationships, "cousin", {
      copy: "Cousin bragging rights are up for grabs.",
      label: "Cousin Watch",
    });

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: 6,
      title: copy.title ?? relationshipTitle,
      type: "cousin",
    };
  }

  if (branchA && branchB && branchA === branchB && branchA !== "Patriarch") {
    const copy = relationshipCopy(
      relationships,
      "same-branch",
      {
        copy: "Civil war in the family branch.",
        label: "Same branch",
      },
    );

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: 7,
      title: copy.title ?? relationshipTitle,
      type: "same-branch",
    };
  }

  if (branchA && branchB && branchA !== branchB) {
    const copy = relationshipCopy(
      relationships,
      "different-branch",
      {
        copy: "Branch bragging rights loading.",
        label: "Branch vs branch",
      },
    );

    return {
      branchA,
      branchB,
      copy: copy.copy,
      label: copy.label,
      priority: 8,
      title: copy.title ?? relationshipTitle,
      type: "different-branch",
    };
  }

  const fallbackCopy = relationshipCopy(relationships, "fallback", {
    copy: genericCopy,
    label: "Owned teams",
  });

  return {
    branchA,
    branchB,
    copy: fallbackCopy.copy,
    label: fallbackCopy.label,
    priority: 9,
    title: fallbackCopy.title ?? relationshipTitle,
    type: "fallback",
  };
}
