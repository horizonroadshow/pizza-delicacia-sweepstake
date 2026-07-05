import { norburyGroupSweepstake } from "@/data/sweepstakes/norbury-group";
import { pizzaDelicaciaSweepstake } from "@/data/sweepstakes/pizza-delicacia";

export type { SweepstakeConfig } from "@/data/sweepstakes/types";
export { norburyGroupSweepstake, pizzaDelicaciaSweepstake };

export const sweepstakeConfigs = [pizzaDelicaciaSweepstake, norburyGroupSweepstake];

export function getSweepstakeConfigBySlug(slug: string) {
  return sweepstakeConfigs.find((config) => config.slug === slug);
}

export function getActiveSweepstakeConfig() {
  const configuredSlug = process.env.NEXT_PUBLIC_SWEEPSTAKE_SLUG;

  if (!configuredSlug) {
    return pizzaDelicaciaSweepstake;
  }

  return getSweepstakeConfigBySlug(configuredSlug) ?? pizzaDelicaciaSweepstake;
}

export const activeSweepstakeConfig = getActiveSweepstakeConfig();
