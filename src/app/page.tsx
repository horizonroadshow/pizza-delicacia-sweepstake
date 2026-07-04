import { SweepstakeDashboard } from "@/components/SweepstakeDashboard";
import { participants } from "@/data/sweepstake";
import { loadOpenFootballFixturesPreview } from "@/lib/football/fixturePreview";
import { loadOpenFootballKnockoutDraw } from "@/lib/football/knockoutPreview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [fixturesPreview, knockoutDraw] = await Promise.all([
    loadOpenFootballFixturesPreview(participants),
    loadOpenFootballKnockoutDraw(participants),
  ]);

  return (
    <SweepstakeDashboard
      fixturesPreview={fixturesPreview}
      knockoutDraw={knockoutDraw}
      participants={participants}
    />
  );
}
