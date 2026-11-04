import type { trainerPlanSchema } from '@muvit/validators';
import type { z } from 'zod';
import { UseCaseError } from '../../../shared/use-case-error.js';
import { PLAN_CATALOG } from '../../billing/plan-catalog.js';

type TrainerPlan = z.infer<typeof trainerPlanSchema>;

export interface StudentPlanUsageRepository {
  getStudentPlanUsage(
    trainerId: string,
    excludingStudentId?: string,
  ): Promise<{ plan: TrainerPlan; activeStudentCount: number }>;
}

export interface StudentPlanLimitPolicy {
  assertCanActivate(trainerId: string, excludingStudentId?: string): Promise<void>;
}

export class AssertStudentPlanLimitUseCase implements StudentPlanLimitPolicy {
  constructor(private readonly repository: StudentPlanUsageRepository) {}

  async assertCanActivate(trainerId: string, excludingStudentId?: string): Promise<void> {
    const usage = await this.repository.getStudentPlanUsage(trainerId, excludingStudentId);
    const limit = PLAN_CATALOG[usage.plan].activeStudentLimit;
    if (limit === null || usage.activeStudentCount < limit) return;

    throw new UseCaseError(
      'student_plan_limit_exceeded',
      `Seu plano aceita até ${limit} alunos ativos.`,
    );
  }
}
