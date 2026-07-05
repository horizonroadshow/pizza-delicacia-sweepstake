import { activeSweepstakeConfig } from "@/data/sweepstakes";
import { renderSweepstakePage } from "@/app/sweepstakePage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  return renderSweepstakePage(activeSweepstakeConfig);
}
