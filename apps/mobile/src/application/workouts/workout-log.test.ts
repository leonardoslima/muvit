import { describe, expect, it, vi } from 'vitest';
import type { ApiRequester } from '../../lib/api';
import type { WorkoutLogOperation } from '../../lib/log-queue';
import {
  buildFinishWorkoutLogInput,
  buildInitialSets,
  finishWorkoutWithOfflineFallback,
  groupSetsByExercise,
  toOptionalNumber,
} from './workout-log';

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise = (_value: T): void => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

const workoutExercise = {
  id: 'workout-exercise-id',
  sets: 2,
  loadKg: 40,
};

describe('workout log service', () => {
  it('builds initial set state from workout exercises', () => {
    expect(buildInitialSets([workoutExercise])).toEqual([
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '',
        loadKg: '40',
        completed: false,
      },
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 2,
        repsDone: '',
        loadKg: '40',
        completed: false,
      },
    ]);
  });

  it('groups sets by workout exercise id', () => {
    const sets = buildInitialSets([workoutExercise]);

    expect(groupSetsByExercise(sets).get('workout-exercise-id')).toHaveLength(2);
  });

  it('normalizes optional numbers', () => {
    expect(toOptionalNumber('10,5')).toBe(10.5);
    expect(toOptionalNumber('abc')).toBeUndefined();
    expect(toOptionalNumber(' ')).toBeUndefined();
  });

  it('não inicia request quando o journal falha ao persistir', async () => {
    const journal = {
      ensure: vi.fn().mockRejectedValue(new Error('storage indisponível')),
      drain: vi.fn(),
      get: vi.fn(),
    };
    const bindRequester = vi.fn();
    const sets = [
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '10',
        loadKg: '40',
        completed: true,
      },
    ];

    await expect(
      finishWorkoutWithOfflineFallback({
        ownerAuthUserId: 'user-a',
        journal,
        bindRequester,
        workoutDayId: 'day-a',
        date: '2026-08-27',
        durationMin: 45,
        isOwnerCurrent: () => true,
        sets,
      }),
    ).rejects.toThrow('storage indisponível');

    expect(bindRequester).not.toHaveBeenCalled();
    expect(journal.drain).not.toHaveBeenCalled();
    expect(journal.get).not.toHaveBeenCalled();
  });

  it('persiste operação determinística antes do drain e relê terminal como enviado', async () => {
    const events: string[] = [];
    const requester: ApiRequester = {
      async request<T>(): Promise<T> {
        return null as T;
      },
    };
    const bindRequester = vi.fn(() => requester);
    let persistedOperation: WorkoutLogOperation | null = null;
    const journal = {
      ensure: vi.fn(async (operation: WorkoutLogOperation) => {
        events.push('ensure');
        persistedOperation = operation;
        return operation;
      }),
      drain: vi.fn(async (_ownerAuthUserId: string, _bindRequester: () => ApiRequester) => {
        events.push('drain');
      }),
      get: vi.fn(async () => {
        events.push('get');
        return persistedOperation
          ? { ...persistedOperation, stage: { kind: 'terminal' as const } }
          : null;
      }),
    };
    const sets = [
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '10',
        loadKg: '40',
        completed: true,
      },
    ];

    await expect(
      finishWorkoutWithOfflineFallback({
        ownerAuthUserId: 'user-a',
        journal,
        bindRequester,
        workoutDayId: 'day-a',
        date: '2026-08-27',
        durationMin: 18,
        isOwnerCurrent: () => true,
        sets,
      }),
    ).resolves.toEqual({ queued: false });

    expect(events).toEqual(['ensure', 'drain', 'get']);
    expect(journal.ensure).toHaveBeenCalledWith({
      version: 1,
      operationId: 'user-a:2026-08-27:day-a',
      ownerAuthUserId: 'user-a',
      workoutDayId: 'day-a',
      date: '2026-08-27',
      finish: buildFinishWorkoutLogInput(sets, 18),
      stage: { kind: 'create' },
    });
    expect(journal.drain).toHaveBeenCalledTimes(1);
    expect(journal.drain.mock.calls[0]?.[0]).toBe('user-a');
    expect(journal.drain.mock.calls[0]?.[1]()).toBe(requester);
    expect(journal.get).toHaveBeenCalledWith('user-a:2026-08-27:day-a');
  });

  it('retorna queued quando a etapa relida permanece não terminal', async () => {
    const operation = {
      version: 1 as const,
      operationId: 'user-a:2026-08-27:day-a',
      ownerAuthUserId: 'user-a',
      workoutDayId: 'day-a',
      date: '2026-08-27',
      finish: {
        durationMin: 18,
        completed: true,
        sets: [
          {
            workoutExerciseId: 'workout-exercise-id',
            setNumber: 1,
            repsDone: 10,
            loadKg: 40,
            completed: true,
          },
        ],
      },
      stage: { kind: 'create' as const },
    };
    const journal = {
      ensure: vi.fn().mockResolvedValue(operation),
      drain: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(operation),
    };

    await expect(
      finishWorkoutWithOfflineFallback({
        ownerAuthUserId: 'user-a',
        journal,
        bindRequester: vi.fn(),
        workoutDayId: 'day-a',
        date: '2026-08-27',
        durationMin: 18,
        isOwnerCurrent: () => true,
        sets: [
          {
            workoutExerciseId: 'workout-exercise-id',
            setNumber: 1,
            repsDone: '10',
            loadKg: '40',
            completed: true,
          },
        ],
      }),
    ).resolves.toEqual({ queued: true });
  });

  it('mantém a operação enfileirada quando a identidade muda durante o ensure', async () => {
    const ensureStarted = deferred<void>();
    const releaseEnsure = deferred<void>();
    let currentOwnerAuthUserId = 'user-a';
    let persistedOperation: WorkoutLogOperation | null = null;
    const journal = {
      ensure: vi.fn(async (operation: WorkoutLogOperation) => {
        persistedOperation = operation;
        ensureStarted.resolve();
        await releaseEnsure.promise;
        return operation;
      }),
      drain: vi.fn(),
      get: vi.fn(async () => persistedOperation),
    };
    const bindRequester = vi.fn(() => ({ request: vi.fn() }));

    const finish = finishWorkoutWithOfflineFallback({
      ownerAuthUserId: 'user-a',
      journal,
      bindRequester,
      isOwnerCurrent: () => currentOwnerAuthUserId === 'user-a',
      workoutDayId: 'day-a',
      date: '2026-08-27',
      durationMin: 18,
      sets: [
        {
          workoutExerciseId: 'workout-exercise-id',
          setNumber: 1,
          repsDone: '10',
          loadKg: '40',
          completed: true,
        },
      ],
    });

    await ensureStarted.promise;
    currentOwnerAuthUserId = 'user-b';
    releaseEnsure.resolve();

    await expect(finish).resolves.toEqual({ queued: true });
    expect(bindRequester).not.toHaveBeenCalled();
    expect(journal.drain).not.toHaveBeenCalled();
  });

  it('entrega ao drain o requester capturado para o owner verificado', async () => {
    let currentOwnerAuthUserId = 'user-a';
    const requesterA: ApiRequester = {
      async request<T>(): Promise<T> {
        return null as T;
      },
    };
    const requesterB: ApiRequester = {
      async request<T>(): Promise<T> {
        return null as T;
      },
    };
    const bindRequester = vi.fn(() =>
      currentOwnerAuthUserId === 'user-a' ? requesterA : requesterB,
    );
    const operation: WorkoutLogOperation = {
      version: 1,
      operationId: 'user-a:2026-08-27:day-a',
      ownerAuthUserId: 'user-a',
      workoutDayId: 'day-a',
      date: '2026-08-27',
      finish: {
        durationMin: 18,
        completed: true,
        sets: [
          {
            workoutExerciseId: 'workout-exercise-id',
            setNumber: 1,
            repsDone: 10,
            loadKg: 40,
            completed: true,
          },
        ],
      },
      stage: { kind: 'create' },
    };
    const journal = {
      ensure: vi.fn().mockResolvedValue(operation),
      drain: vi.fn(async (_ownerAuthUserId: string, capturedRequester: () => ApiRequester) => {
        currentOwnerAuthUserId = 'user-b';
        expect(capturedRequester()).toBe(requesterA);
      }),
      get: vi.fn().mockResolvedValue(operation),
    };

    await finishWorkoutWithOfflineFallback({
      ownerAuthUserId: 'user-a',
      journal,
      bindRequester,
      isOwnerCurrent: () => currentOwnerAuthUserId === 'user-a',
      workoutDayId: 'day-a',
      date: '2026-08-27',
      durationMin: 18,
      sets: [
        {
          workoutExerciseId: 'workout-exercise-id',
          setNumber: 1,
          repsDone: '10',
          loadKg: '40',
          completed: true,
        },
      ],
    });

    expect(bindRequester).toHaveBeenCalledTimes(1);
  });

  it('usa a duração real informada ao montar o log', () => {
    const sets = [
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '10',
        loadKg: '40',
        completed: true,
      },
    ];

    expect(buildFinishWorkoutLogInput(sets, 18)).toMatchObject({
      durationMin: 18,
      completed: true,
    });
  });
});
