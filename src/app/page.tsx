import { SweepstakeDashboard } from "@/components/SweepstakeDashboard";
import { createParticipants } from "@/data/sweepstake";
import { activeSweepstakeConfig } from "@/data/sweepstakes";
import { loadOpenFootballFixturesPreview } from "@/lib/football/fixturePreview";
import { loadOpenFootballKnockoutDraw } from "@/lib/football/knockoutPreview";
import { loadOpenFootballLeaderboardParticipants } from "@/lib/football/leaderboardStatus";
import { loadOddsPreview } from "@/lib/odds/oddsPreview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const participants = createParticipants(activeSweepstakeConfig);
  const [knockoutDraw, leaderboardParticipants] = await Promise.all([
    loadOpenFootballKnockoutDraw(participants),
    loadOpenFootballLeaderboardParticipants(participants),
  ]);
  const oddsPreview = await loadOddsPreview(leaderboardParticipants);
  const fixturesPreview = await loadOpenFootballFixturesPreview(
    leaderboardParticipants,
    new Date(),
    oddsPreview,
  );

  return (
    <SweepstakeDashboard
      config={activeSweepstakeConfig}
      fixturesPreview={fixturesPreview}
      knockoutDraw={knockoutDraw}
      oddsPreview={oddsPreview}
      participants={leaderboardParticipants}
    />
  );
}
