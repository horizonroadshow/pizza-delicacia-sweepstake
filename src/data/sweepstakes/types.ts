import type { Allocation, Participant } from "@/data/sweepstake";

export type ParticipantRecord = Pick<Participant, "id" | "name">;

export type SweepstakeRelationshipConfig = {
  branches?: Record<string, string[]>;
  cousinGroups?: string[][];
  excludedInsightParticipants?: string[];
  generationGroups?: {
    child?: string[];
    middle?: string[];
    olderSibling?: string[];
  };
  genericBraggingRightsCopy?: string;
  households?: string[][];
  parentChildPairs?: [string, string][];
  participantContext?: Record<
    string,
    {
      ageBand?: string;
      gender?: "female" | "male" | "mixed";
      generation?: "child" | "middle" | "older-sibling";
    }
  >;
  relationshipCopy?: Partial<
    Record<
      | "cousin"
      | "different-branch"
      | "fallback"
      | "older-sibling"
      | "parent-child"
      | "same-branch"
      | "same-household"
      | "sibling"
      | "spouse"
      | "young-child",
      {
        copy: string;
        label: string;
        title?: string;
      }
    >
  >;
  siblingGroups?: string[][];
  socialPairs?: {
    copy: string;
    label: string;
    pair: [string, string];
    priority: number;
    type: string;
  }[];
  spousePairs?: [string, string][];
  title?: string;
};

export type SweepstakeCopyConfig = {
  firstPrizeDreamText?: string;
  feudEyebrow?: string;
  genericBraggingRightsCopy?: string;
  groupStyleLabel?: string;
  heroEyebrow?: string;
  leaderboardTitle?: string;
  memberLabelPlural?: string;
  playerStatDetail?: string;
};

export type SweepstakeSectionId = "fixtures" | "knockout";

export type SweepstakeConfig = {
  allocations: Allocation[];
  commissioner: string;
  copy?: SweepstakeCopyConfig;
  displayTitleLines: [string, string];
  entryFee: string;
  id: string;
  name: string;
  participants: ParticipantRecord[];
  prizeSplit: {
    first: string;
    second: string;
    summary: string;
  };
  relationships?: SweepstakeRelationshipConfig;
  layoutVariant?: "default" | "wide-compact";
  sectionOrder?: SweepstakeSectionId[];
  slug: string;
  teamsPerParticipant: number;
  themeVariant?: "apple-glass" | "default" | "futuristic-premium" | "premium-black-gold";
  totalPrizePot: string;
};
