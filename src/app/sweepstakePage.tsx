import { SweepstakeDashboard } from "@/components/SweepstakeDashboard";
import { createParticipants } from "@/data/sweepstake";
import type { SweepstakeConfig } from "@/data/sweepstakes";
import { loadOpenFootballFixturesPreview } from "@/lib/football/fixturePreview";
import { loadOpenFootballKnockoutDraw } from "@/lib/football/knockoutPreview";
import { loadOpenFootballLeaderboardParticipants } from "@/lib/football/leaderboardStatus";
import { loadOddsPreview } from "@/lib/odds/oddsPreview";

export async function renderSweepstakePage(config: SweepstakeConfig) {
  const participants = createParticipants(config);
  const [knockoutDraw, leaderboardParticipants] = await Promise.all([
    loadOpenFootballKnockoutDraw(participants),
    loadOpenFootballLeaderboardParticipants(participants),
  ]);
  const oddsPreview = await loadOddsPreview(leaderboardParticipants, config);
  const fixturesPreview = await loadOpenFootballFixturesPreview(
    leaderboardParticipants,
    new Date(),
    oddsPreview,
  );

  return (
    <SweepstakeDashboard
      config={config}
      fixturesPreview={fixturesPreview}
      knockoutDraw={knockoutDraw}
      oddsPreview={oddsPreview}
      participants={leaderboardParticipants}
    />
  );
}
