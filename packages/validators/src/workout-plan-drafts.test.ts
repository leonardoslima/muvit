import { describe, expect, it } from 'vitest';
import * as validatorExports from './index.js';
import {
  publishWorkoutPlanDraftSchema,
  saveWorkoutPlanDraftSchema,
  workoutPlanDraftPayloadSchema,
  workoutPlanDraftSchema,
} from './workout-plan-drafts.js';
import { createWorkoutPlanSchema, workoutExerciseInputSchema } from './workouts.js';

const exercise = {
  exerciseId: '00000000-0000-4000-8000-000000000001',
  exerciseOrder: 0,
  sets: 3,
  reps: '10',
};

const payload = {
  name: 'Treino de força',
  days: [{ label: 'Treino A', dayOrder: 0, exercises: [exercise] }],
};

describe('contratos de rascunhos de planos de treino', () => {
  it('exporta os schemas de payload, save, publish e resposta', () => {
    expect(validatorExports.workoutPlanDraftPayloadSchema).toBe(workoutPlanDraftPayloadSchema);
    expect(validatorExports.saveWorkoutPlanDraftSchema).toBe(saveWorkoutPlanDraftSchema);
    expect(validatorExports.publishWorkoutPlanDraftSchema).toBe(publishWorkoutPlanDraftSchema);
    expect(validatorExports.workoutPlanDraftSchema).toBe(workoutPlanDraftSchema);
  });

  it.each([
    ['nome em branco', { ...payload, name: '   ' }],
    ['nome acima do limite', { ...payload, name: 'n'.repeat(201) }],
    ['dia em branco', { ...payload, days: [{ ...payload.days[0], label: '   ' }] }],
    [
      'repetições em branco',
      { ...payload, days: [{ ...payload.days[0], exercises: [{ ...exercise, reps: '  ' }] }] },
    ],
    ['dia sem exercício', { ...payload, days: [{ ...payload.days[0], exercises: [] }] }],
    [
      'séries zero',
      { ...payload, days: [{ ...payload.days[0], exercises: [{ ...exercise, sets: 0 }] }] },
    ],
    [
      'séries acima do limite',
      { ...payload, days: [{ ...payload.days[0], exercises: [{ ...exercise, sets: 21 }] }] },
    ],
    [
      'séries fracionárias',
      { ...payload, days: [{ ...payload.days[0], exercises: [{ ...exercise, sets: 1.5 }] }] },
    ],
    [
      'descanso negativo',
      { ...payload, days: [{ ...payload.days[0], exercises: [{ ...exercise, restSeconds: -1 }] }] },
    ],
    [
      'descanso acima do limite',
      {
        ...payload,
        days: [{ ...payload.days[0], exercises: [{ ...exercise, restSeconds: 601 }] }],
      },
    ],
    [
      'descanso fracionário',
      {
        ...payload,
        days: [{ ...payload.days[0], exercises: [{ ...exercise, restSeconds: 1.5 }] }],
      },
    ],
    [
      'carga negativa',
      { ...payload, days: [{ ...payload.days[0], exercises: [{ ...exercise, loadKg: -1 }] }] },
    ],
    [
      'carga acima do limite',
      { ...payload, days: [{ ...payload.days[0], exercises: [{ ...exercise, loadKg: 1001 }] }] },
    ],
    [
      'oito dias',
      {
        ...payload,
        days: Array.from({ length: 8 }, (_, dayOrder) => ({ ...payload.days[0], dayOrder })),
      },
    ],
    ['notas acima do limite', { ...payload, notes: 'n'.repeat(2001) }],
  ])('rejeita %s', (_description, invalidPayload) => {
    expect(workoutPlanDraftPayloadSchema.safeParse(invalidPayload).success).toBe(false);
  });

  it('aceita os extremos válidos e apara textos obrigatórios', () => {
    const oneDayMinimum = {
      name: ' Treino mínimo ',
      days: [
        {
          label: ' Treino A ',
          dayOrder: 0,
          exercises: [{ ...exercise, reps: ' 1 ', sets: 1, restSeconds: 0, loadKg: 0 }],
        },
      ],
    };
    const sevenDaysMaximum = {
      name: 'Treino máximo',
      notes: 'n'.repeat(2000),
      days: Array.from({ length: 7 }, (_, dayOrder) => ({
        label: `Treino ${dayOrder + 1}`,
        dayOrder,
        exercises: [{ ...exercise, sets: 20, restSeconds: 600, loadKg: 1000 }],
      })),
    };

    const minimumResult = workoutPlanDraftPayloadSchema.safeParse(oneDayMinimum);
    expect(minimumResult.success).toBe(true);
    if (minimumResult.success) {
      expect(minimumResult.data.name).toBe('Treino mínimo');
      expect(minimumResult.data.days[0]?.label).toBe('Treino A');
      expect(minimumResult.data.days[0]?.exercises[0]?.reps).toBe('1');
    }
    expect(workoutPlanDraftPayloadSchema.safeParse(sevenDaysMaximum).success).toBe(true);
  });

  it('rejeita o save quando o dia selecionado não consta no payload', () => {
    expect(
      saveWorkoutPlanDraftSchema.safeParse({
        studentId: '00000000-0000-4000-8000-000000000002',
        payload,
        selectedDayOrder: 1,
      }).success,
    ).toBe(false);
  });

  it('aceita save inicial sem revisão e publish com revisão conhecida', () => {
    expect(
      saveWorkoutPlanDraftSchema.safeParse({
        studentId: '00000000-0000-4000-8000-000000000002',
        payload,
        selectedDayOrder: 0,
      }).success,
    ).toBe(true);
    expect(publishWorkoutPlanDraftSchema.safeParse({ payload, revision: 1 }).success).toBe(true);
  });

  it.each([0, -1, 1.5])('rejeita revisão inválida %s ao publicar', (revision) => {
    expect(publishWorkoutPlanDraftSchema.safeParse({ payload, revision }).success).toBe(false);
  });

  it('mantém o comportamento aceito pelos schemas públicos existentes', () => {
    const legacyPlan = createWorkoutPlanSchema.safeParse({
      studentId: '00000000-0000-4000-8000-000000000002',
      name: 'Plano legado',
      days: [{ label: 'Treino A', dayOrder: 0, exercises: [] }],
    });

    expect(legacyPlan.success).toBe(true);
    expect(workoutExerciseInputSchema.safeParse({ ...exercise, reps: ' ' }).success).toBe(true);
  });

  it('normaliza datas do retorno de draft para ISO', () => {
    const createdAt = new Date('2026-10-15T12:00:00.000Z');
    const updatedAt = new Date('2026-10-15T13:00:00.000Z');
    const result = workoutPlanDraftSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000003',
      trainerId: '00000000-0000-4000-8000-000000000004',
      studentId: '00000000-0000-4000-8000-000000000002',
      sourcePlanId: null,
      payload,
      selectedDayOrder: 0,
      revision: 1,
      createdAt,
      updatedAt,
      exerciseReferences: [
        {
          id: exercise.exerciseId,
          name: 'Agachamento',
          muscleGroup: 'legs',
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBe('2026-10-15T12:00:00.000Z');
      expect(result.data.updatedAt).toBe('2026-10-15T13:00:00.000Z');
    }
  });
});
