import type { Allocation, Participant } from "@/data/sweepstake";

export type ParticipantRecord = Pick<Participant, "id" | "name">;

export type SweepstakeConfig = {
  allocations: Allocation[];
  commissioner: string;
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
  slug: string;
  teamsPerParticipant: number;
  totalPrizePot: string;
};
