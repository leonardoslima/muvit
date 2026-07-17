import { describe, expect, it } from 'vitest';
import { DEMO_PASSWORD, buildDemoScenario } from './demo.js';

const referenceDate = new Date('2026-07-16T12:00:00.000Z');

describe('buildDemoScenario', () => {
  it('gera as mesmas identidades e distribuições com a mesma referência', () => {
    const first = buildDemoScenario(referenceDate);
    const second = buildDemoScenario(referenceDate);

    expect(second).toEqual(first);
    expect(first.credentials.password).toBe(DEMO_PASSWORD);
    expect(first.credentials.trainer.email).toBe('trainer@muvit.dev');
    expect(first.students.map((student) => student.email)).toEqual(
      Array.from(
        { length: 10 },
        (_, index) => `aluno${String(index + 1).padStart(2, '0')}@muvit.dev`,
      ),
    );
    expect(first.students.filter((student) => student.status === 'active')).toHaveLength(6);
    expect(first.students.filter((student) => student.status === 'paused')).toHaveLength(2);
    expect(first.students.filter((student) => student.status === 'inactive')).toHaveLength(2);
    expect(new Set(first.students.map((student) => student.email)).size).toBe(10);
  });

  it('gera os volumes aprovados e referências lógicas íntegras', () => {
    const scenario = buildDemoScenario(referenceDate);

    expect(scenario.credentials.students).toHaveLength(10);
    expect(scenario.assessments).toHaveLength(24);
    expect(scenario.plans).toHaveLength(10);
    expect(scenario.plans.filter((plan) => plan.status === 'active')).toHaveLength(6);
    expect(scenario.plans.filter((plan) => plan.status === 'archived')).toHaveLength(3);
    expect(scenario.plans.filter((plan) => plan.status === 'draft')).toHaveLength(1);
    expect(scenario.logs).toHaveLength(40);
    expect(scenario.plans.every((plan) => plan.days.length >= 2 && plan.days.length <= 4)).toBe(
      true,
    );
    expect(
      scenario.plans.every((plan) =>
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
    const scenario = buildDemoScenario(referenceDate);
    const sevenDaysAgo = new Date(referenceDate);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const thirtyDaysAgo = new Date(referenceDate);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    expect(
      scenario.students.filter(
        (student) => student.createdAt !== undefined && student.createdAt >= sevenDaysAgo,
      ),
    ).toHaveLength(2);
    expect(
      scenario.assessments.filter(
        (assessment) => assessment.createdAt !== undefined && assessment.createdAt >= thirtyDaysAgo,
      ),
    ).toHaveLength(8);
  });
});
