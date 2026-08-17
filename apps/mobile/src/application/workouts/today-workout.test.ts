import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, ApiTransportError } from '../../lib/api';
import type { GuidedSession, GuidedSessionPhase } from './guided-session';
import {
  InvalidTodayWorkoutPayloadError,
  estimateWorkoutDuration,
  getWorkoutDraftProgress,
  loadTodayWorkout,
  loadTodayWorkoutWithOfflineFallback,
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
const cachedPlanSummary = {
  id: cachedPlan.id,
  studentId: cachedPlan.studentId,
  trainerId: cachedPlan.trainerId,
  name: cachedPlan.name,
  startDate: cachedPlan.startDate,
  endDate: cachedPlan.endDate,
  status: cachedPlan.status,
  createdAt: cachedPlan.createdAt,
};
const cachedTodayWorkout = {
  status: 'available',
  plan: cachedPlan,
  day: cachedDay,
};

function createCacheStorage(serialized = JSON.stringify(cachedTodayWorkout)) {
  return {
    getItem: vi.fn().mockResolvedValue(serialized),
    setItem: vi.fn().mockResolvedValue(undefined),
  };
}

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
  it('calcula progresso apenas com exercícios executáveis', () => {
    const zeroSetExercise = {
      ...cachedExercise,
      id: '66666666-6666-4666-8666-666666666666',
      exerciseId: '77777777-7777-4777-8777-777777777777',
      sets: 0,
      exercise: {
        ...cachedExercise.exercise,
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Alongamento',
      },
    };
    const day = { ...cachedDay, exercises: [cachedExercise, zeroSetExercise] };
    const session: GuidedSession = {
      version: 1,
      workoutDayId: day.id,
      startedAtMs: 1_000,
      updatedAtMs: 2_000,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      phase: 'ready-to-finish',
      restEndsAtMs: null,
      sets: [
        {
          workoutExerciseId: cachedExercise.id,
          setNumber: 1,
          repsDone: '10',
          loadKg: '20',
          completed: true,
        },
      ],
    };

    expect(getWorkoutDraftProgress(day, session)).toEqual({
      completedExerciseCount: 1,
      totalExerciseCount: 1,
      progressPercent: 100,
      next: null,
    });
  });
});

describe('loadTodayWorkout', () => {
  it('returns no-active-plan before requesting plan details', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce({
        items: [{ ...cachedPlanSummary, status: 'draft' }],
      }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toEqual({ status: 'no-active-plan' });
    expect(api.request).toHaveBeenCalledOnce();
  });

  it('selects the first non-completed day from the active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [cachedPlanSummary] })
        .mockResolvedValueOnce({
          ...cachedPlan,
          days: [
            { ...cachedDay, exercises: [] },
            {
              ...cachedDay,
              id: '66666666-6666-4666-8666-666666666666',
              exercises: [
                {
                  ...cachedExercise,
                  id: '77777777-7777-4777-8777-777777777777',
                  workoutDayId: '66666666-6666-4666-8666-666666666666',
                },
              ],
            },
          ],
        })
        .mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'available',
      day: { id: '66666666-6666-4666-8666-666666666666' },
    });
  });

  it('returns no-workout-today when the active plan has no days', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [cachedPlanSummary] })
        .mockResolvedValueOnce({ ...cachedPlan, days: [] })
        .mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'no-workout-today',
      plan: { id: cachedPlan.id },
    });
  });

  it('returns no-workout-today when every day lacks an exercise with a set', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [cachedPlanSummary] })
        .mockResolvedValueOnce({
          ...cachedPlan,
          days: [{ ...cachedDay, exercises: [{ ...cachedExercise, sets: 0 }] }],
        })
        .mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'no-workout-today',
      plan: { id: cachedPlan.id },
    });
  });
});

describe('fallback offline do treino de hoje', () => {
  it('rejeita plano de outro summary sem ler nem escrever cache válido', async () => {
    const otherPlanId = '66666666-6666-4666-8666-666666666666';
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [cachedPlanSummary] })
        .mockResolvedValueOnce({
          ...cachedPlan,
          id: otherPlanId,
          days: [{ ...cachedDay, planId: otherPlanId }],
        })
        .mockResolvedValueOnce({ items: [] }),
    };
    const storage = createCacheStorage();

    await expect(
      loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
    ).rejects.toBeInstanceOf(InvalidTodayWorkoutPayloadError);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each([
    ['summaries', [{ records: [] }]],
    ['plano', [{ items: [cachedPlanSummary] }, { id: cachedPlan.id, days: [] }, { items: [] }]],
    [
      'logs',
      [
        { items: [cachedPlanSummary] },
        cachedPlan,
        { items: [{ workoutDayId: cachedDay.id, completed: true }] },
      ],
    ],
  ])(
    'propaga payload estrutural invalido de %s mesmo com cache valido',
    async (_name, responses) => {
      const api = { request: vi.fn() };
      for (const response of responses) api.request.mockResolvedValueOnce(response);
      const storage = createCacheStorage();

      await expect(
        loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
      ).rejects.toBeInstanceOf(InvalidTodayWorkoutPayloadError);
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it.each([401, 403, 500])('propaga ApiError %i mesmo com cache valido', async (status) => {
    const error = new ApiError('falha HTTP', status);
    const api = { request: vi.fn().mockRejectedValueOnce(error) };
    const storage = createCacheStorage();

    await expect(
      loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
    ).rejects.toBe(error);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('retorna stale somente para erro de transporte tipado', async () => {
    const api = {
      request: vi.fn().mockRejectedValueOnce(new ApiTransportError(new TypeError('offline'))),
    };
    const storage = createCacheStorage();

    await expect(
      loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
    ).resolves.toEqual({ data: cachedTodayWorkout, stale: true });
    expect(storage.getItem).toHaveBeenCalledWith('today-workout:auth-user-id');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('integra o cliente real ao cache stale quando o fetch nativo falha', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    const api = new ApiClient({
      baseUrl: 'https://api.muvit.test',
      getCookie: () => 'muvit.session_token=session-value',
      onUnauthorized: vi.fn(),
    });
    const storage = createCacheStorage();

    try {
      await expect(
        loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
      ).resolves.toEqual({ data: cachedTodayWorkout, stale: true });
      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(storage.getItem).toHaveBeenCalledWith('today-workout:auth-user-id');
      expect(storage.setItem).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('propaga erro inesperado sem consultar cache', async () => {
    const error = new Error('falha inesperada');
    const api = { request: vi.fn().mockRejectedValueOnce(error) };
    const storage = createCacheStorage();

    await expect(
      loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
    ).rejects.toBe(error);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('propaga falha de escrita sem consultar cache anterior', async () => {
    const writeError = new Error('falha ao escrever cache');
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [cachedPlanSummary] })
        .mockResolvedValueOnce(cachedPlan)
        .mockResolvedValueOnce({ items: [] }),
    };
    const storage = createCacheStorage();
    storage.setItem.mockRejectedValueOnce(writeError);

    await expect(
      loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
    ).rejects.toBe(writeError);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('propaga falha de leitura do cache no caminho de transporte', async () => {
    const readError = new Error('falha ao ler cache');
    const api = { request: vi.fn().mockRejectedValueOnce(new ApiTransportError('offline')) };
    const storage = createCacheStorage();
    storage.getItem.mockRejectedValueOnce(readError);

    await expect(
      loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
    ).rejects.toBe(readError);
  });

  it('propaga falha de parsing do cache no caminho de transporte', async () => {
    const api = { request: vi.fn().mockRejectedValueOnce(new ApiTransportError('offline')) };
    const storage = createCacheStorage('{invalido');

    await expect(
      loadTodayWorkoutWithOfflineFallback({ api, authUserId: 'auth-user-id', storage }),
    ).rejects.toBeInstanceOf(SyntaxError);
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
  it('rejects a valid plan whose id differs from the selected summary', async () => {
    const otherPlanId = '66666666-6666-4666-8666-666666666666';
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [cachedPlanSummary] })
        .mockResolvedValueOnce({
          ...cachedPlan,
          id: otherPlanId,
          days: [{ ...cachedDay, planId: otherPlanId }],
        }),
    };

    await expect(loadWorkoutDay({ api, dayId: cachedDay.id })).rejects.toBeInstanceOf(
      InvalidTodayWorkoutPayloadError,
    );
  });

  it('rejects an online day whose exercise belongs to another day', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          items: [cachedPlanSummary],
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

    await expect(loadWorkoutDay({ api, dayId: cachedDay.id })).rejects.toBeInstanceOf(
      InvalidTodayWorkoutPayloadError,
    );
  });

  it('loads the requested day from the active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          items: [
            {
              ...cachedPlanSummary,
              id: '66666666-6666-4666-8666-666666666666',
              status: 'draft',
            },
            cachedPlanSummary,
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
            { ...cachedPlanSummary, status: 'draft' },
            {
              ...cachedPlanSummary,
              id: '66666666-6666-4666-8666-666666666666',
              status: 'archived',
            },
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
        .mockResolvedValueOnce({ items: [cachedPlanSummary] })
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
