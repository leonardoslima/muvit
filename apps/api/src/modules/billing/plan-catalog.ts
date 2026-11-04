import type { trainerPlanSchema } from '@muvit/validators';
import type { z } from 'zod';

export type TrainerPlan = z.infer<typeof trainerPlanSchema>;

export type PlanCatalogEntry = {
  activeStudentLimit: number | null;
  monthlyPriceCents: number;
  annualPriceCents: number;
};

export const PLAN_CATALOG = {
  free: { activeStudentLimit: 3, monthlyPriceCents: 0, annualPriceCents: 0 },
  starter: { activeStudentLimit: 15, monthlyPriceCents: 4990, annualPriceCents: 47_880 },
  pro: { activeStudentLimit: 50, monthlyPriceCents: 9990, annualPriceCents: 95_880 },
  team: { activeStudentLimit: null, monthlyPriceCents: 19_990, annualPriceCents: 191_880 },
} as const satisfies Record<TrainerPlan, PlanCatalogEntry>;

export function getPlanPriceCents(plan: TrainerPlan, billingInterval: 'monthly' | 'annual') {
  const catalogEntry = PLAN_CATALOG[plan];
  return billingInterval === 'monthly'
    ? catalogEntry.monthlyPriceCents
    : catalogEntry.annualPriceCents;
}
