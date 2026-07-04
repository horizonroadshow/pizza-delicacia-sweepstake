import { SweepstakeDashboard } from "@/components/SweepstakeDashboard";
import { participants } from "@/data/sweepstake";
import { loadOpenFootballFixturesPreview } from "@/lib/football/fixturePreview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const fixturesPreview = await loadOpenFootballFixturesPreview(participants);

  return (
    <SweepstakeDashboard
      fixturesPreview={fixturesPreview}
      participants={participants}
    />
  );
}
