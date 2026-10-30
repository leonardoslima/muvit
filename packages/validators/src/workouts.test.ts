import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createWorkoutPlanSchema,
  finishWorkoutLogSchema,
  updateWorkoutPlanSchema,
  workoutPlanFullSchema,
} from './workouts.js';

const studentId = '00000000-0000-4000-8000-000000000001';

function planInput(dayCount = 1) {
  return {
    studentId,
    name: 'Plano de treino',
    days: Array.from({ length: dayCount }, (_, dayOrder) => ({
      label: `Dia ${dayOrder + 1}`,
      dayOrder,
      exercises: [],
    })),
  };
}

describe('workout plan schemas', () => {
  it('omits status when a PATCH body leaves it out', () => {
    const parsed = updateWorkoutPlanSchema.parse({ name: 'Treino renomeado' });

    expect(parsed).toEqual({ name: 'Treino renomeado' });
    expect(Object.hasOwn(parsed, 'status')).toBe(false);
  });

  it('keeps the draft default for creation when status is omitted', () => {
    expect(createWorkoutPlanSchema.parse(planInput()).status).toBe('draft');
  });

  it('keeps the completed default when a workout log is finished', () => {
    const parsed = finishWorkoutLogSchema.parse({
      durationMin: 30,
      sets: [{ workoutExerciseId: studentId, setNumber: 1 }],
    });

    expect(parsed.completed).toBe(true);
  });

  it('allows up to seven days and reports an issue for longer plans', () => {
    expect(createWorkoutPlanSchema.safeParse(planInput(7)).success).toBe(true);

    const result = createWorkoutPlanSchema.safeParse(planInput(8));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ['days'], code: 'too_big' }),
    );
  });

  it('accepts UUID-shaped IDs without RFC version bits', () => {
    const result = createWorkoutPlanSchema.safeParse({
      ...planInput(),
      studentId: '00000000-0000-0000-0000-000000000001',
    });

    expect(result.success).toBe(true);
  });

  it('rejects oversized arrays before parsing their elements', () => {
    let parsedLabels = 0;
    const inputSchema = z
      .array(
        z.object({
          label: z.string().superRefine(() => {
            parsedLabels += 1;
          }),
        }),
      )
      .max(7);

    const result = inputSchema.safeParse(
      Array.from({ length: 8 }, (_, index) => ({ label: `Dia ${index + 1}` })),
    );

    expect(result.success).toBe(false);
    expect(parsedLabels).toBe(0);
  });

  it('serializes Date values in workout plan responses as ISO strings', () => {
    const createdAt = new Date('2026-10-23T21:00:00.000Z');
    const parsed = workoutPlanFullSchema.parse({
      id: studentId,
      studentId,
      trainerId: null,
      name: 'Plano de treino',
      startDate: null,
      endDate: null,
      status: 'draft',
      notes: null,
      createdAt,
      days: [],
    });

    expect(parsed.createdAt).toBe('2026-10-23T21:00:00.000Z');
  });
});
