import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getSweepstakeConfigBySlug,
  sweepstakeConfigs,
} from "@/data/sweepstakes";
import { renderSweepstakePage } from "@/app/sweepstakePage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return sweepstakeConfigs.map((config) => ({
    slug: config.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getSweepstakeConfigBySlug(slug);

  if (!config) {
    return {};
  }

  return {
    description: `Track the ${config.name}, including team owners, prizes, fixtures, results, and knockout progress.`,
    title: config.name,
  };
}

export default async function SweepstakeSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getSweepstakeConfigBySlug(slug);

  if (!config) {
    notFound();
  }

  return renderSweepstakePage(config);
}
