import { pizzaDelicaciaSweepstake } from "@/data/sweepstakes/pizza-delicacia";

export type { SweepstakeConfig } from "@/data/sweepstakes/types";
export { pizzaDelicaciaSweepstake };

export const activeSweepstakeConfig = pizzaDelicaciaSweepstake;
export const sweepstakeConfigs = [pizzaDelicaciaSweepstake];

export function getSweepstakeConfigBySlug(slug: string) {
  return sweepstakeConfigs.find((config) => config.slug === slug);
}
