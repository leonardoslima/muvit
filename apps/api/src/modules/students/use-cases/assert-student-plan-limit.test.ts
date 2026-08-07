import { describe, expect, it } from 'vitest';
import type { StudentPlanUsageRepository } from './assert-student-plan-limit.js';
import { AssertStudentPlanLimitUseCase } from './assert-student-plan-limit.js';

class FakeStudentPlanUsageRepository implements StudentPlanUsageRepository {
  excludingStudentId: string | undefined;

  constructor(
    private readonly plan: 'free' | 'starter' | 'pro' | 'team',
    private readonly activeStudentCount: number,
  ) {}

  async getStudentPlanUsage(_trainerId: string, excludingStudentId?: string) {
    this.excludingStudentId = excludingStudentId;
    return { plan: this.plan, activeStudentCount: this.activeStudentCount };
  }
}

describe('AssertStudentPlanLimitUseCase', () => {
  it('bloqueia a ativação do quarto aluno no plano free', async () => {
    const policy = new AssertStudentPlanLimitUseCase(new FakeStudentPlanUsageRepository('free', 3));

    await expect(policy.assertCanActivate('trainer-id')).rejects.toMatchObject({
      code: 'student_plan_limit_exceeded',
    });
  });

  it('desconsidera o próprio aluno ao validar uma reativação', async () => {
    const repository = new FakeStudentPlanUsageRepository('free', 2);
    const policy = new AssertStudentPlanLimitUseCase(repository);

    await expect(policy.assertCanActivate('trainer-id', 'student-id')).resolves.toBeUndefined();
    expect(repository.excludingStudentId).toBe('student-id');
  });

  it('mantém o plano team ilimitado mesmo acima de cinquenta alunos', async () => {
    const policy = new AssertStudentPlanLimitUseCase(
      new FakeStudentPlanUsageRepository('team', 51),
    );

    await expect(policy.assertCanActivate('trainer-id')).resolves.toBeUndefined();
  });
});
