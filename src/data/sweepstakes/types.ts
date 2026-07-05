import type { Allocation, Participant } from "@/data/sweepstake";

export type ParticipantRecord = Pick<Participant, "id" | "name">;

export type SweepstakeRelationshipConfig = {
  branches?: Record<string, string[]>;
  households?: string[][];
  parentChildPairs?: [string, string][];
  siblingGroups?: string[][];
  socialPairs?: {
    copy: string;
    label: string;
    pair: [string, string];
    priority: number;
    type: string;
  }[];
  spousePairs?: [string, string][];
};

export type SweepstakeCopyConfig = {
  heroEyebrow?: string;
  memberLabelPlural?: string;
};

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
  slug: string;
  teamsPerParticipant: number;
  totalPrizePot: string;
};
