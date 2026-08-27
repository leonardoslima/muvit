import { describe, expect, it, vi } from 'vitest';
import type { GuidedSession } from '../application/workouts/guided-session';
import type { WorkoutDay } from '../application/workouts/today-workout';
import { createWorkoutSessionStorage, workoutSessionKey } from './workout-session-storage';

const day: WorkoutDay = {
  id: '22222222-2222-4222-8222-222222222222',
  label: 'Treino A',
  dayOrder: 0,
  planId: '44444444-4444-4444-8444-444444444444',
  exercises: [
    {
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
    },
  ],
};

const sessionV2: GuidedSession = {
  version: 2,
  workoutDayId: day.id,
  startedAtMs: 1_000,
  updatedAtMs: 2_000,
  activeDurationMs: 500,
  activeSinceMs: 1_500,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  phase: 'set',
  restEndsAtMs: null,
  sets: [
    {
      workoutExerciseId: day.exercises[0].id,
      setNumber: 1,
      repsDone: '10',
      loadKg: '20',
      completed: false,
    },
  ],
};

const legacySessionV1 = {
  version: 1 as const,
  workoutDayId: 'day-a',
  startedAtMs: 1_000,
  updatedAtMs: 2_000,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  phase: 'set' as const,
  restEndsAtMs: null,
  sets: [
    {
      workoutExerciseId: 'exercise-a',
      setNumber: 1,
      repsDone: '10',
      loadKg: '20',
      completed: false,
    },
  ],
};

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));

  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    values,
  };
}

describe('workoutSessionStorage', () => {
  it('salva e restaura sessão ativa com proprietário e snapshot validado', async () => {
    const storage = memoryStorage();
    const adapter = createWorkoutSessionStorage(storage);

    await adapter.save('user-a', day, sessionV2);

    await expect(adapter.load('user-a', day.id)).resolves.toEqual({
      kind: 'active',
      version: 2,
      ownerAuthUserId: 'user-a',
      day,
      session: sessionV2,
    });
  });

  it('normaliza o relógio de um rascunho legado sem apagar seu progresso', async () => {
    const key = workoutSessionKey('user-a', 'day-a');
    const storage = memoryStorage({ [key]: JSON.stringify(legacySessionV1) });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', 'day-a')).resolves.toEqual({
      kind: 'legacy',
      version: 1,
      session: {
        ...legacySessionV1,
        version: 2,
        activeDurationMs: 1_000,
        activeSinceMs: null,
      },
    });
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('normaliza duração legada para zero quando o relógio estiver invertido', async () => {
    const legacy = { ...legacySessionV1, updatedAtMs: 500 };
    const key = workoutSessionKey('user-a', legacy.workoutDayId);
    const storage = memoryStorage({ [key]: JSON.stringify(legacy) });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', legacy.workoutDayId)).resolves.toMatchObject({
      kind: 'legacy',
      session: {
        activeDurationMs: 0,
        activeSinceMs: null,
        sets: legacy.sets,
      },
    });
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('retorna nulo quando não existe rascunho', async () => {
    const storage = memoryStorage();
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', day.id)).resolves.toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('remove somente a chave exata do usuário e treino', async () => {
    const siblingKey = workoutSessionKey('user-a', 'day-b');
    const exactKey = workoutSessionKey('user-a', 'day-a');
    const unrelatedKey = 'muvit_workout_session:user-b:day-a:extra';
    const storage = memoryStorage({
      [exactKey]: JSON.stringify(legacySessionV1),
      [siblingKey]: JSON.stringify({ ...legacySessionV1, workoutDayId: 'day-b' }),
      [unrelatedKey]: JSON.stringify(legacySessionV1),
    });
    const adapter = createWorkoutSessionStorage(storage);

    await adapter.remove('user-a', 'day-a');

    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
    expect(storage.values.has(exactKey)).toBe(false);
    expect(storage.values.has(siblingKey)).toBe(true);
    expect(storage.values.has(unrelatedKey)).toBe(true);
  });

  it('remove payload JSON inválido sem expor erro de parse', async () => {
    const exactKey = workoutSessionKey('user-a', day.id);
    const storage = memoryStorage({ [exactKey]: '{inválido' });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', day.id)).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
    expect(storage.values.has(exactKey)).toBe(false);
  });

  it('remove payload estruturalmente inválido sem expor erro de validação', async () => {
    const exactKey = workoutSessionKey('user-a', day.id);
    const invalidSession = { ...sessionV2, updatedAtMs: '2_000' };
    const storage = memoryStorage({ [exactKey]: JSON.stringify(invalidSession) });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', day.id)).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
    expect(storage.values.has(exactKey)).toBe(false);
  });

  it.each([
    {
      name: 'proprietário diferente',
      payload: {
        kind: 'active',
        version: 2,
        ownerAuthUserId: 'user-b',
        day,
        session: sessionV2,
      },
    },
    {
      name: 'snapshot com id diferente da sessão',
      payload: {
        kind: 'active',
        version: 2,
        ownerAuthUserId: 'user-a',
        day: {
          ...day,
          id: '66666666-6666-4666-8666-666666666666',
          exercises: day.exercises.map((exercise) => ({
            ...exercise,
            workoutDayId: '66666666-6666-4666-8666-666666666666',
          })),
        },
        session: sessionV2,
      },
    },
    {
      name: 'activeDurationMs negativo',
      payload: {
        kind: 'active',
        version: 2,
        ownerAuthUserId: 'user-a',
        day,
        session: { ...sessionV2, activeDurationMs: -1 },
      },
    },
    {
      name: 'activeSinceMs inválido',
      payload: {
        kind: 'active',
        version: 2,
        ownerAuthUserId: 'user-a',
        day,
        session: { ...sessionV2, activeSinceMs: 'later' },
      },
    },
  ])('rejeita $name sem usar o payload parcialmente', async ({ payload }) => {
    const exactKey = workoutSessionKey('user-a', day.id);
    const storage = memoryStorage({ [exactKey]: JSON.stringify(payload) });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', day.id)).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
  });

  it('rejeita sessão cujo dia não corresponde à rota solicitada', async () => {
    const exactKey = workoutSessionKey('user-a', day.id);
    const storage = memoryStorage({
      [exactKey]: JSON.stringify({
        kind: 'active',
        version: 2,
        ownerAuthUserId: 'user-a',
        day,
        session: { ...sessionV2, workoutDayId: '66666666-6666-4666-8666-666666666666' },
      }),
    });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', day.id)).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
  });

  it('valida snapshot e sessão antes de persistir', async () => {
    const storage = memoryStorage();
    const adapter = createWorkoutSessionStorage(storage);

    await expect(
      adapter.save('user-a', day, { ...sessionV2, activeDurationMs: -1 }),
    ).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('propaga a falha do driver ao salvar o registro', async () => {
    const error = new Error('storage indisponível');
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn().mockRejectedValue(error),
    };
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.save('user-a', day, sessionV2)).rejects.toBe(error);
    expect(storage.setItem).toHaveBeenCalledWith(
      workoutSessionKey('user-a', day.id),
      expect.any(String),
    );
    const call = storage.setItem.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error('chamada de persistência ausente');
    expect(JSON.parse(call[1])).toEqual({
      kind: 'active',
      version: 2,
      ownerAuthUserId: 'user-a',
      day,
      session: sessionV2,
    });
  });
});
