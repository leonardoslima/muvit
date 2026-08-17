import { describe, expect, it, vi } from 'vitest';
import type { GuidedSession, GuidedSessionPhase } from './guided-session';
import {
  estimateWorkoutDuration,
  getWorkoutDraftProgress,
  loadTodayWorkout,
  loadWorkoutDay,
  normalizeCachedTodayWorkout,
  selectNextWorkoutDay,
} from './today-workout';

const cachedExercise = {
  id: '11111111-1111-4111-8111-111111111111',
  workoutDayId: '22222222-2222-4222-8222-222222222222',
  exerciseId: '33333333-3333-4333-8333-333333333333',
  exerciseOrder: 0,
  sets: 1,
  reps: '10',
  restSeconds: 60,
  loadKg: null,
  tempo: null,
  notes: null,
  exercise: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Supino',
    muscleGroup: 'Peito',
  },
};
const cachedDay = {
  id: '22222222-2222-4222-8222-222222222222',
  label: 'Treino A',
  dayOrder: 0,
  planId: '44444444-4444-4444-8444-444444444444',
  exercises: [cachedExercise],
};
const cachedPlan = {
  id: '44444444-4444-4444-8444-444444444444',
  studentId: '55555555-5555-4555-8555-555555555555',
  trainerId: null,
  name: 'Plano',
  startDate: null,
  endDate: null,
  status: 'active',
  notes: null,
  createdAt: '2026-08-15T12:00:00.000Z',
  days: [cachedDay],
};
const cachedEmptyPlan = {
  ...cachedPlan,
  days: [{ ...cachedDay, exercises: [] }],
};

function createWorkoutDay(id: string, exerciseCount = 1, sets = 1) {
  return {
    id,
    label: id,
    dayOrder: 0,
    planId: 'plan-id',
    exercises: Array.from({ length: exerciseCount }, (_, index) => ({
      id: `${id}-exercise-${index}`,
      workoutDayId: id,
      exerciseId: `${id}-catalog-${index}`,
      exerciseOrder: index,
      sets,
      reps: '10',
      restSeconds: 60,
      loadKg: null,
      tempo: null,
      notes: null,
      exercise: {
        id: `${id}-catalog-${index}`,
        name: 'Supino',
        muscleGroup: 'Peito',
      },
    })),
  };
}

describe('cache do treino de hoje', () => {
  it('normaliza os estados atuais e o formato legado do cache', () => {
    expect(normalizeCachedTodayWorkout(null)).toBeUndefined();
    expect(normalizeCachedTodayWorkout({ status: 'no-active-plan' })).toEqual({
      status: 'no-active-plan',
    });
    expect(
      normalizeCachedTodayWorkout({ status: 'available', plan: cachedPlan, day: cachedDay }),
    ).toMatchObject({ status: 'available', day: cachedDay });
    expect(
      normalizeCachedTodayWorkout({ status: 'no-workout-today', plan: cachedEmptyPlan }),
    ).toMatchObject({ status: 'no-workout-today', plan: cachedEmptyPlan });
    expect(normalizeCachedTodayWorkout({ plan: cachedPlan, day: cachedDay })).toMatchObject({
      status: 'available',
      day: cachedDay,
    });
    expect(normalizeCachedTodayWorkout({ cached: true })).toBeUndefined();
    expect(
      normalizeCachedTodayWorkout({
        status: 'available',
        plan: cachedPlan,
        day: { ...cachedDay, id: '66666666-6666-4666-8666-666666666666' },
      }),
    ).toBeUndefined();
    expect(
      normalizeCachedTodayWorkout({
        status: 'available',
        plan: {
          ...cachedPlan,
          days: [{ ...cachedDay, planId: '66666666-6666-4666-8666-666666666666' }],
        },
        day: cachedDay,
      }),
    ).toBeUndefined();
    expect(
      normalizeCachedTodayWorkout({
        status: 'no-workout-today',
        plan: {
          ...cachedEmptyPlan,
          days: [
            {
              ...cachedEmptyPlan.days[0],
              exercises: [
                { ...cachedExercise, workoutDayId: '66666666-6666-4666-8666-666666666666' },
              ],
            },
          ],
        },
      }),
    ).toBeUndefined();
  });

  it('estima pelo menos um minuto quando o treino está vazio', () => {
    expect(estimateWorkoutDuration(cachedEmptyPlan.days[0])).toBe(1);
  });
});

describe('loadTodayWorkout', () => {
  it('returns no-active-plan before requesting plan details', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'draft' }] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toEqual({ status: 'no-active-plan' });
    expect(api.request).toHaveBeenCalledOnce();
  });

  it('selects the first non-completed day from the active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
        .mockResolvedValueOnce({
          id: 'plan-id',
          name: 'Plano',
          days: [createWorkoutDay('day-a', 0), createWorkoutDay('day-b')],
        })
        .mockResolvedValueOnce({ items: [{ workoutDayId: 'day-a', completed: true }] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'available',
      day: { id: 'day-b' },
    });
  });

  it('returns no-workout-today when the active plan has no days', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
        .mockResolvedValueOnce({ id: 'plan-id', name: 'Plano', days: [] })
        .mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'no-workout-today',
      plan: { id: 'plan-id' },
    });
  });

  it('returns no-workout-today when every day lacks an exercise with a set', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
        .mockResolvedValueOnce({
          id: 'plan-id',
          name: 'Plano',
          days: [createWorkoutDay('day-a', 0), createWorkoutDay('day-b', 0)],
        })
        .mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'no-workout-today',
      plan: { id: 'plan-id' },
    });
  });
});

describe('selectNextWorkoutDay', () => {
  it('wraps to the first day when every day was completed', () => {
    const days = [createWorkoutDay('day-a'), { ...createWorkoutDay('day-b'), dayOrder: 1 }];

    expect(
      selectNextWorkoutDay(days, [
        { workoutDayId: 'day-a', completed: true },
        { workoutDayId: 'day-b', completed: true },
        { workoutDayId: 'ignored', completed: false },
      ]),
    ).toEqual(days[0]);
  });

  it('ignores days without a usable exercise', () => {
    const emptyDay = createWorkoutDay('empty-day', 0);
    const validDay = createWorkoutDay('valid-day');
    const zeroSetDay = createWorkoutDay('zero-set-day', 1, 0);

    expect(selectNextWorkoutDay([emptyDay, validDay], [])).toEqual(validDay);
    expect(selectNextWorkoutDay([emptyDay], [])).toBeUndefined();
    expect(selectNextWorkoutDay([zeroSetDay], [])).toBeUndefined();
  });

  it.each<GuidedSessionPhase>(['set', 'rest', 'exercise-complete', 'ready-to-finish', 'summary'])(
    'retorna a primeira série incompleta na ordem do dia durante a fase %s',
    (phase) => {
      const day = createWorkoutDay('day-id', 2, 2);
      const sessionsByPhase: Record<
        GuidedSessionPhase,
        Pick<GuidedSession, 'currentExerciseIndex' | 'currentSetIndex'>
      > = {
        set: { currentExerciseIndex: 1, currentSetIndex: 1 },
        rest: { currentExerciseIndex: 1, currentSetIndex: 0 },
        'exercise-complete': { currentExerciseIndex: 0, currentSetIndex: 0 },
        'ready-to-finish': { currentExerciseIndex: 1, currentSetIndex: 1 },
        summary: { currentExerciseIndex: 1, currentSetIndex: 1 },
      };
      const session: GuidedSession = {
        version: 1,
        workoutDayId: day.id,
        startedAtMs: 1_000,
        updatedAtMs: 2_000,
        ...sessionsByPhase[phase],
        phase,
        restEndsAtMs: phase === 'rest' ? 5_000 : null,
        sets: [
          {
            workoutExerciseId: day.exercises[0].id,
            setNumber: 1,
            repsDone: '10',
            loadKg: '20',
            completed: true,
          },
          {
            workoutExerciseId: day.exercises[1].id,
            setNumber: 1,
            repsDone: '10',
            loadKg: '20',
            completed: true,
          },
          {
            workoutExerciseId: 'external-exercise',
            setNumber: 1,
            repsDone: '10',
            loadKg: '20',
            completed: true,
          },
        ],
      };

      expect(getWorkoutDraftProgress(day, session).next).toEqual({
        exerciseName: 'Supino',
        setNumber: 2,
        totalSets: 2,
      });
    },
  );
});

describe('loadWorkoutDay', () => {
  it('rejects an online day whose exercise belongs to another day', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          items: [{ id: cachedPlan.id, status: 'active' }],
        })
        .mockResolvedValueOnce({
          ...cachedPlan,
          days: [
            {
              ...cachedDay,
              exercises: [
                { ...cachedExercise, workoutDayId: '66666666-6666-4666-8666-666666666666' },
              ],
            },
          ],
        }),
    };

    await expect(loadWorkoutDay({ api, dayId: cachedDay.id })).rejects.toThrow('plano inválido');
  });

  it('loads the requested day from the active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          items: [
            { id: 'draft-plan-id', status: 'draft' },
            { id: cachedPlan.id, status: 'active' },
          ],
        })
        .mockResolvedValueOnce(cachedPlan),
    };

    await expect(loadWorkoutDay({ api, dayId: cachedDay.id })).resolves.toMatchObject({
      id: cachedDay.id,
    });
    expect(api.request).toHaveBeenNthCalledWith(2, `/workout-plans/${cachedPlan.id}`);
  });

  it('falls back to the first plan when there is no active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          items: [
            { id: cachedPlan.id, status: 'draft' },
            { id: 'second-plan-id', status: 'paused' },
          ],
        })
        .mockResolvedValueOnce(cachedPlan),
    };

    await expect(loadWorkoutDay({ api, dayId: cachedDay.id })).resolves.toMatchObject({
      id: cachedDay.id,
    });
    expect(api.request).toHaveBeenNthCalledWith(2, `/workout-plans/${cachedPlan.id}`);
  });

  it('rejects when the requested day is not found', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: cachedPlan.id, status: 'active' }] })
        .mockResolvedValueOnce(cachedPlan),
    };

    await expect(
      loadWorkoutDay({ api, dayId: '66666666-6666-4666-8666-666666666666' }),
    ).rejects.toThrow('dia não encontrado');
  });

  it('rejects when there is no workout plan to load from', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadWorkoutDay({ api, dayId: 'day-a' })).rejects.toThrow('sem plano');
  });
});
