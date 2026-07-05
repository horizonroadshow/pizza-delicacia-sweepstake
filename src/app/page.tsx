import { SweepstakeDashboard } from "@/components/SweepstakeDashboard";
import { createParticipants } from "@/data/sweepstake";
import { activeSweepstakeConfig } from "@/data/sweepstakes";
import { loadOpenFootballFixturesPreview } from "@/lib/football/fixturePreview";
import { loadOpenFootballKnockoutDraw } from "@/lib/football/knockoutPreview";
import { loadOpenFootballLeaderboardParticipants } from "@/lib/football/leaderboardStatus";

export const dynamic = "force-dynamic";

export default async function Home() {
  const participants = createParticipants(activeSweepstakeConfig);
  const [fixturesPreview, knockoutDraw, leaderboardParticipants] = await Promise.all([
    loadOpenFootballFixturesPreview(participants),
    loadOpenFootballKnockoutDraw(participants),
    loadOpenFootballLeaderboardParticipants(participants),
  ]);

  return (
    <SweepstakeDashboard
      config={activeSweepstakeConfig}
      fixturesPreview={fixturesPreview}
      knockoutDraw={knockoutDraw}
      participants={leaderboardParticipants}
    />
  );
}
