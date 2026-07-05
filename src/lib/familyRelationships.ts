const branches = {
  "Rita/Bill": ["Rita", "Bill", "Ajay", "Aditi", "Ayesha", "Karan"],
  "Vijay/Sunita": [
    "Vijay",
    "Sunita",
    "Arun",
    "Esha",
    "Sienna",
    "Layla",
    "Priya",
    "Steve",
    "Simran",
    "Avi",
  ],
  "Yash/Asha": ["Yash", "Asha", "Alisha", "Rohan", "Kavita", "Yaad", "Veeran"],
} as const;

const spousePairs = [
  ["Rita", "Bill"],
  ["Ajay", "Aditi"],
  ["Ayesha", "Karan"],
  ["Yash", "Asha"],
  ["Kavita", "Yaad"],
  ["Vijay", "Sunita"],
  ["Arun", "Esha"],
  ["Priya", "Steve"],
] as const;

const parentChildPairs = [
  ["Nanaji", "Asha"],
  ["Nanaji", "Vijay"],
  ["Nanaji", "Rita"],
  ["Rita", "Ajay"],
  ["Rita", "Ayesha"],
  ["Bill", "Ajay"],
  ["Bill", "Ayesha"],
  ["Yash", "Alisha"],
  ["Yash", "Rohan"],
  ["Yash", "Kavita"],
  ["Asha", "Alisha"],
  ["Asha", "Rohan"],
  ["Asha", "Kavita"],
  ["Kavita", "Veeran"],
  ["Yaad", "Veeran"],
  ["Vijay", "Arun"],
  ["Vijay", "Priya"],
  ["Sunita", "Arun"],
  ["Sunita", "Priya"],
  ["Arun", "Sienna"],
  ["Arun", "Layla"],
  ["Esha", "Sienna"],
  ["Esha", "Layla"],
  ["Priya", "Simran"],
  ["Priya", "Avi"],
  ["Steve", "Simran"],
  ["Steve", "Avi"],
] as const;

const siblingGroups = [
  ["Asha", "Vijay", "Rita"],
  ["Ajay", "Ayesha"],
  ["Alisha", "Rohan", "Kavita"],
  ["Arun", "Priya"],
  ["Sienna", "Layla"],
  ["Simran", "Avi"],
] as const;

export type FamilyRelationshipType =
  | "different-branch"
  | "fallback"
  | "parent-child"
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

function sameSiblingGroup(a: string, b: string) {
  return siblingGroups.some((group) => {
    const members: readonly string[] = group;

    return members.includes(a) && members.includes(b);
  });
}

export function familyBranch(owner: string) {
  if (owner === "Nanaji") {
    return "Patriarch";
  }

  return Object.entries(branches).find(([, members]) => {
    const branchMembers: readonly string[] = members;

    return branchMembers.includes(owner);
  })?.[0];
}

export function familyRelationshipInsight(
  ownerA: string,
  ownerB: string,
): FamilyRelationshipInsight {
  const branchA = familyBranch(ownerA);
  const branchB = familyBranch(ownerB);

  if (spousePairs.some((pair) => pairMatches(ownerA, ownerB, pair))) {
    return {
      branchA,
      branchB,
      copy: "Marriage temporarily suspended for 90 minutes.",
      label: "Spouse v spouse",
      priority: 0,
      title: "House Derby",
      type: "spouse",
    };
  }

  if (parentChildPairs.some((pair) => pairMatches(ownerA, ownerB, pair))) {
    return {
      branchA,
      branchB,
      copy: "Parent-child bragging rights are on the line.",
      label: "Parent v child",
      priority: 1,
      title: "Family Bragging Rights",
      type: "parent-child",
    };
  }

  if (sameSiblingGroup(ownerA, ownerB)) {
    return {
      branchA,
      branchB,
      copy: "Sibling rivalry has entered the chat.",
      label: "Sibling v sibling",
      priority: 2,
      title: "Family Bragging Rights",
      type: "sibling",
    };
  }

  if (branchA && branchB && branchA === branchB && branchA !== "Patriarch") {
    return {
      branchA,
      branchB,
      copy: `Civil war in the ${branchA} branch.`,
      label: "Same branch",
      priority: 3,
      title: "Family Branch Battle",
      type: "same-branch",
    };
  }

  if (branchA && branchB && branchA !== branchB) {
    return {
      branchA,
      branchB,
      copy: `The ${branchA} branch meets the ${branchB} branch.`,
      label: "Branch v branch",
      priority: 4,
      title: "Family Branch Battle",
      type: "different-branch",
    };
  }

  return {
    branchA,
    branchB,
    copy: "Family bragging rights loading.",
    label: "Owned teams",
    priority: 5,
    title: "Family Bragging Rights",
    type: "fallback",
  };
}
