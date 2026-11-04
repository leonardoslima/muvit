import { describe, expect, it } from 'vitest';
import { workoutPlanDraftPayloadSchema } from './workout-plan-drafts.js';
import {
  createWorkoutPlanSchema,
  finishWorkoutLogSchema,
  logSetInputSchema,
  logSetSchema,
  updateWorkoutPlanSchema,
  workoutExerciseFullSchema,
  workoutExerciseInputSchema,
} from './workouts.js';

const exercise = {
  exerciseId: '00000000-0000-4000-8000-000000000001',
  exerciseOrder: 0,
  sets: 3,
  reps: '10',
};
const logSet = { workoutExerciseId: exercise.exerciseId, setNumber: 1 };

function planWithLoad(loadKg: number) {
  return {
    name: 'Treino',
    days: [{ label: 'A', dayOrder: 0, exercises: [{ ...exercise, loadKg }] }],
  };
}

describe('cargas inteiras dos exercícios', () => {
  it.each([0, 39, 1000])('aceita %s kg em prescrições, rascunhos e séries', (loadKg: number) => {
    const plan = planWithLoad(loadKg);
    expect(workoutExerciseInputSchema.parse({ ...exercise, loadKg }).loadKg).toBe(loadKg);
    expect(logSetInputSchema.parse({ ...logSet, loadKg }).loadKg).toBe(loadKg);
    expect(
      createWorkoutPlanSchema.safeParse({ ...plan, studentId: exercise.exerciseId }).success,
    ).toBe(true);
    expect(updateWorkoutPlanSchema.safeParse(plan).success).toBe(true);
    expect(workoutPlanDraftPayloadSchema.safeParse(plan).success).toBe(true);
    expect(
      finishWorkoutLogSchema.safeParse({ durationMin: 30, sets: [{ ...logSet, loadKg }] }).success,
    ).toBe(true);
  });

  it.each([39.4, -1, 1001])('rejeita %s kg em todos os contratos de entrada', (loadKg: number) => {
    const plan = planWithLoad(loadKg);
    expect(workoutExerciseInputSchema.safeParse({ ...exercise, loadKg }).success).toBe(false);
    expect(logSetInputSchema.safeParse({ ...logSet, loadKg }).success).toBe(false);
    expect(
      createWorkoutPlanSchema.safeParse({ ...plan, studentId: exercise.exerciseId }).success,
    ).toBe(false);
    expect(updateWorkoutPlanSchema.safeParse(plan).success).toBe(false);
    expect(workoutPlanDraftPayloadSchema.safeParse(plan).success).toBe(false);
    expect(
      finishWorkoutLogSchema.safeParse({ durationMin: 30, sets: [{ ...logSet, loadKg }] }).success,
    ).toBe(false);
  });

  it('explica a exigência de carga inteira em pt-BR', () => {
    for (const result of [
      workoutExerciseInputSchema.safeParse({ ...exercise, loadKg: 39.4 }),
      logSetInputSchema.safeParse({ ...logSet, loadKg: 39.4 }),
    ]) {
      expect(result.success).toBe(false);
      if (result.success) continue;
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['loadKg'],
          message: 'A carga deve ser um número inteiro.',
        }),
      );
    }
  });

  it('preserva carga opcional e representação string, número ou null nas respostas', () => {
    expect(workoutExerciseInputSchema.safeParse(exercise).success).toBe(true);
    expect(logSetInputSchema.safeParse(logSet).success).toBe(true);
    for (const loadKg of ['39', 39, null]) {
      expect(workoutExerciseFullSchema.shape.loadKg.parse(loadKg)).toBe(loadKg);
      expect(logSetSchema.shape.loadKg.parse(loadKg)).toBe(loadKg);
    }
  });
});
