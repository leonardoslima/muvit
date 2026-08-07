import { describe, expect, it } from 'vitest';
import { type DemoIdentities, buildDemoScenario } from './demo.js';

const referenceDate = new Date('2026-07-16T12:00:00.000Z');
const identities: DemoIdentities = {
  trainer: {
    authUserId: '10000000-0000-4000-8000-000000000001',
    profileId: '20000000-0000-4000-8000-000000000001',
    email: 'trainer@muvit.dev',
    name: 'Professor Demo',
  },
  independentStudent: {
    authUserId: '10000000-0000-4000-8000-000000000002',
    profileId: '20000000-0000-4000-8000-000000000002',
    email: 'aluno.independente@muvit.dev',
    name: 'Aluno Independente Demo',
  },
};

describe('buildDemoScenario', () => {
  it('gera as mesmas identidades e distribuições com a mesma referência', () => {
    const first = buildDemoScenario(identities, referenceDate);
    const second = buildDemoScenario(identities, referenceDate);
    const managedStudents = first.students.filter((student) => !student.isIndependent);
    const independentStudent = first.students.find((student) => student.isIndependent);

    expect(second).toEqual(first);
    expect(first.trainer).toEqual(identities.trainer);
    expect(managedStudents.map((student) => student.email)).toEqual(
      Array.from(
        { length: 10 },
        (_, index) => `aluno${String(index + 1).padStart(2, '0')}@muvit.dev`,
      ),
    );
    expect(managedStudents.filter((student) => student.status === 'active')).toHaveLength(6);
    expect(managedStudents.filter((student) => student.status === 'paused')).toHaveLength(2);
    expect(managedStudents.filter((student) => student.status === 'inactive')).toHaveLength(2);
    expect(managedStudents.every((student) => student.authUserId === null)).toBe(true);
    expect(independentStudent).toMatchObject({
      id: identities.independentStudent.profileId,
      authUserId: identities.independentStudent.authUserId,
      email: identities.independentStudent.email,
      isIndependent: true,
    });
    expect(new Set(first.students.map((student) => student.email)).size).toBe(11);
  });

  it('gera os volumes aprovados e referências lógicas íntegras', () => {
    const scenario = buildDemoScenario(identities, referenceDate);
    const trainerPlans = scenario.plans.filter((plan) => plan.studentIndex < 10);

    expect(scenario.students).toHaveLength(11);
    expect(scenario.assessments).toHaveLength(24);
    expect(scenario.plans).toHaveLength(11);
    expect(trainerPlans.filter((plan) => plan.status === 'active')).toHaveLength(6);
    expect(trainerPlans.filter((plan) => plan.status === 'archived')).toHaveLength(3);
    expect(trainerPlans.filter((plan) => plan.status === 'draft')).toHaveLength(1);
    expect(scenario.logs).toHaveLength(41);
    expect(trainerPlans.every((plan) => plan.days.length >= 2 && plan.days.length <= 4)).toBe(true);
    expect(
      trainerPlans.every((plan) =>
        plan.days.every((day) => day.exercises.length >= 4 && day.exercises.length <= 6),
      ),
    ).toBe(true);
    expect(
      scenario.logs.every((log) => {
        const plan = scenario.plans[log.studentIndex];
        const day = plan?.days.find((item) => item.dayOrder === log.workoutDayOrder);
        return (
          day !== undefined &&
          log.sets.every((set) =>
            day.exercises.some((exercise) => exercise.exerciseOrder === set.exerciseOrder),
          )
        );
      }),
    ).toBe(true);
  });

  it('mantém duas matrículas e oito avaliações dentro das janelas do dashboard', () => {
    const scenario = buildDemoScenario(identities, referenceDate);
    const sevenDaysAgo = new Date(referenceDate);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const thirtyDaysAgo = new Date(referenceDate);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    expect(
      scenario.students.filter(
        (student) =>
          !student.isIndependent &&
          student.createdAt !== undefined &&
          student.createdAt >= sevenDaysAgo,
      ),
    ).toHaveLength(2);
    expect(
      scenario.assessments.filter(
        (assessment) => assessment.createdAt !== undefined && assessment.createdAt >= thirtyDaysAgo,
      ),
    ).toHaveLength(8);
  });

  it('inclui somente dois perfis autenticáveis e os volumes completos', () => {
    const scenario = buildDemoScenario(identities, referenceDate);
    const managedStudents = scenario.students.filter((student) => !student.isIndependent);
    const independentStudent = scenario.students.find((student) => student.isIndependent);

    expect(scenario.trainer).toEqual(identities.trainer);
    expect(scenario.students).toHaveLength(11);
    expect(managedStudents).toHaveLength(10);
    expect(managedStudents.every((student) => student.authUserId === null)).toBe(true);
    expect(independentStudent).toMatchObject({
      id: identities.independentStudent.profileId,
      authUserId: identities.independentStudent.authUserId,
      isIndependent: true,
    });
    expect(scenario.assessments).toHaveLength(24);
    expect(scenario.plans).toHaveLength(11);
    expect(scenario.logs).toHaveLength(41);
    expect(scenario.trainerSubscription).toMatchObject({
      plan: 'pro',
      billingInterval: 'annual',
      status: 'active',
    });
    expect(scenario.billingInvoices).toHaveLength(3);
    expect(scenario.billingInvoices.every((invoice) => invoice.status === 'paid')).toBe(true);
    expect(scenario.billingInvoices.every((invoice) => invoice.amountCents > 0)).toBe(true);
  });
});
