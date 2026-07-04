import { SweepstakeDashboard } from "@/components/SweepstakeDashboard";
import { participants } from "@/data/sweepstake";

export default function Home() {
  return <SweepstakeDashboard participants={participants} />;
}
