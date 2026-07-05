import { teams } from "@/data/sweepstake";
import type { SweepstakeConfig } from "@/data/sweepstakes/types";

export type SweepstakeValidationResult = {
  errors: string[];
  ok: boolean;
  summary: {
    allocatedTeamCount: number;
    participantCount: number;
    teamsPerParticipant: number;
    uniqueAllocatedTeamCount: number;
    worldCupTeamCount: number;
  };
  warnings: string[];
};

const FULL_WORLD_CUP_TEAM_COUNT = 48;

export function validateSweepstakeConfig(
  config: SweepstakeConfig,
): SweepstakeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const knownTeamIds = new Set(teams.map((team) => team.id));
  const participantIds = new Set<string>();
  const allocatedTeamIds: string[] = [];
  const allocationParticipantIds = new Set<string>();

  for (const participant of config.participants) {
    if (participantIds.has(participant.id)) {
      errors.push(`Duplicate participant id: ${participant.id}`);
    }

    participantIds.add(participant.id);
  }

  for (const allocation of config.allocations) {
    if (!participantIds.has(allocation.participantId)) {
      errors.push(
        `Allocation references unknown participant id: ${allocation.participantId}`,
      );
    }

    if (allocationParticipantIds.has(allocation.participantId)) {
      errors.push(
        `Participant has more than one allocation: ${allocation.participantId}`,
      );
    }

    allocationParticipantIds.add(allocation.participantId);

    if (allocation.teamIds.length !== config.teamsPerParticipant) {
      errors.push(
        `${allocation.participantId} has ${allocation.teamIds.length} teams; expected ${config.teamsPerParticipant}`,
      );
    }

    for (const teamId of allocation.teamIds) {
      allocatedTeamIds.push(teamId);

      if (!knownTeamIds.has(teamId)) {
        errors.push(`Unknown team id allocated: ${teamId}`);
      }
    }
  }

  for (const participant of config.participants) {
    if (!allocationParticipantIds.has(participant.id)) {
      errors.push(`Missing allocation for participant: ${participant.id}`);
    }
  }

  const duplicateTeamIds = allocatedTeamIds.filter(
    (teamId, index) => allocatedTeamIds.indexOf(teamId) !== index,
  );

  for (const teamId of Array.from(new Set(duplicateTeamIds))) {
    errors.push(`Team allocated more than once: ${teamId}`);
  }

  if (allocatedTeamIds.length !== config.participants.length * config.teamsPerParticipant) {
    errors.push(
      `Total allocated teams (${allocatedTeamIds.length}) does not match participants x teamsPerParticipant (${config.participants.length * config.teamsPerParticipant})`,
    );
  }

  if (allocatedTeamIds.length !== FULL_WORLD_CUP_TEAM_COUNT) {
    warnings.push(
      `This config allocates ${allocatedTeamIds.length} teams; a full World Cup sweepstake should allocate ${FULL_WORLD_CUP_TEAM_COUNT}.`,
    );
  }

  return {
    errors,
    ok: errors.length === 0,
    summary: {
      allocatedTeamCount: allocatedTeamIds.length,
      participantCount: config.participants.length,
      teamsPerParticipant: config.teamsPerParticipant,
      uniqueAllocatedTeamCount: new Set(allocatedTeamIds).size,
      worldCupTeamCount: teams.length,
    },
    warnings,
  };
}
