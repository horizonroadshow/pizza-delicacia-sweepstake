import { createKnockoutDraw, type KnockoutDraw } from "@/data/knockout";
import type { Participant } from "@/data/sweepstake";
import { createOpenFootballAdapter } from "@/lib/football/adapters/openFootball";

export async function loadOpenFootballKnockoutDraw(
  participants: Participant[],
): Promise<KnockoutDraw> {
  const result = await createOpenFootballAdapter().fetchWorldCupFixtures({
    season: 2026,
  });
  const knockoutMatches = result.matches.filter(
    (match) => match.round !== "group-stage",
  );

  return createKnockoutDraw(knockoutMatches, {
    participants,
    teams: result.teams,
  });
}
