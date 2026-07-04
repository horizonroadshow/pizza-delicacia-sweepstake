import { SweepstakeDashboard } from "@/components/SweepstakeDashboard";
import { participants } from "@/data/sweepstake";
import { loadOpenFootballFixturesPreview } from "@/lib/football/fixturePreview";
import { loadOpenFootballKnockoutDraw } from "@/lib/football/knockoutPreview";
import { loadOpenFootballLeaderboardParticipants } from "@/lib/football/leaderboardStatus";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [fixturesPreview, knockoutDraw, leaderboardParticipants] = await Promise.all([
    loadOpenFootballFixturesPreview(participants),
    loadOpenFootballKnockoutDraw(participants),
    loadOpenFootballLeaderboardParticipants(participants),
  ]);

  return (
    <SweepstakeDashboard
      fixturesPreview={fixturesPreview}
      knockoutDraw={knockoutDraw}
      participants={leaderboardParticipants}
    />
  );
}
