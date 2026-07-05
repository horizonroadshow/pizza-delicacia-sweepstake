import { norburyGroupSweepstake } from "@/data/sweepstakes/norbury-group";
import { pizzaDelicaciaSweepstake } from "@/data/sweepstakes/pizza-delicacia";

export type { SweepstakeConfig } from "@/data/sweepstakes/types";
export { norburyGroupSweepstake, pizzaDelicaciaSweepstake };

export const activeSweepstakeConfig = pizzaDelicaciaSweepstake;
export const sweepstakeConfigs = [pizzaDelicaciaSweepstake, norburyGroupSweepstake];

export function getSweepstakeConfigBySlug(slug: string) {
  return sweepstakeConfigs.find((config) => config.slug === slug);
}
