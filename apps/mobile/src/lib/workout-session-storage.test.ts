import { describe, expect, it, vi } from 'vitest';
import type { GuidedSession } from '../application/workouts/guided-session';
import { createWorkoutSessionStorage, workoutSessionKey } from './workout-session-storage';

const session: GuidedSession = {
  version: 1,
  workoutDayId: 'day-a',
  startedAtMs: 1_000,
  updatedAtMs: 2_000,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  phase: 'set',
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
  it('isola e restaura o rascunho por usuário e treino', async () => {
    const storage = memoryStorage();
    const adapter = createWorkoutSessionStorage(storage);

    await adapter.save('user-a', session);

    await expect(adapter.load('user-a', 'day-a')).resolves.toEqual(session);
    await expect(adapter.load('user-b', 'day-a')).resolves.toBeNull();
    await expect(adapter.load('user-a', 'day-b')).resolves.toBeNull();
    expect(workoutSessionKey('user-a', 'day-a')).toBe('muvit_workout_session:user-a:day-a');
  });

  it('descarta um payload armazenado na chave certa com o treino errado', async () => {
    const exactKey = workoutSessionKey('user-a', 'day-a');
    const storage = memoryStorage({
      [exactKey]: JSON.stringify({ ...session, workoutDayId: 'day-b' }),
    });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', 'day-a')).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
    expect(storage.values.has(exactKey)).toBe(false);
  });

  it('salva o payload completo na chave derivada do usuário e treino', async () => {
    const storage = memoryStorage();
    const adapter = createWorkoutSessionStorage(storage);

    await adapter.save('user-a', session);

    expect(storage.setItem).toHaveBeenCalledWith(
      'muvit_workout_session:user-a:day-a',
      JSON.stringify(session),
    );
  });

  it('retorna nulo quando não existe rascunho', async () => {
    const storage = memoryStorage();
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', 'day-a')).resolves.toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('remove somente a chave exata do usuário e treino', async () => {
    const siblingKey = workoutSessionKey('user-a', 'day-b');
    const exactKey = workoutSessionKey('user-a', 'day-a');
    const unrelatedKey = 'muvit_workout_session:user-b:day-a:extra';
    const storage = memoryStorage({
      [exactKey]: JSON.stringify(session),
      [siblingKey]: JSON.stringify({ ...session, workoutDayId: 'day-b' }),
      [unrelatedKey]: JSON.stringify(session),
    });
    const adapter = createWorkoutSessionStorage(storage);

    await adapter.remove('user-a', 'day-a');

    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
    expect(storage.values.has(exactKey)).toBe(false);
    expect(storage.values.has(siblingKey)).toBe(true);
    expect(storage.values.has(unrelatedKey)).toBe(true);
  });

  it('remove payload JSON inválido sem expor erro de parse', async () => {
    const exactKey = workoutSessionKey('user-a', 'day-a');
    const storage = memoryStorage({ [exactKey]: '{inválido' });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', 'day-a')).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
    expect(storage.values.has(exactKey)).toBe(false);
  });

  it('remove payload estruturalmente inválido sem expor erro de validação', async () => {
    const exactKey = workoutSessionKey('user-a', 'day-a');
    const invalidSession = { ...session, updatedAtMs: '2_000' };
    const storage = memoryStorage({ [exactKey]: JSON.stringify(invalidSession) });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', 'day-a')).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
    expect(storage.values.has(exactKey)).toBe(false);
  });

  it.each([
    ['version', { ...session, version: 2 }],
    ['workoutDayId', { ...session, workoutDayId: 42 }],
    ['startedAtMs', { ...session, startedAtMs: '1_000' }],
    ['updatedAtMs', { ...session, updatedAtMs: '2_000' }],
    ['currentExerciseIndex', { ...session, currentExerciseIndex: 0.5 }],
    ['currentSetIndex', { ...session, currentSetIndex: -1 }],
    ['phase', { ...session, phase: 'paused' }],
    ['restEndsAtMs', { ...session, restEndsAtMs: 'later' }],
    ['sets', { ...session, sets: 'invalid' }],
    ['workoutExerciseId', { ...session, sets: [{ ...session.sets[0], workoutExerciseId: 42 }] }],
    ['setNumber', { ...session, sets: [{ ...session.sets[0], setNumber: 0 }] }],
    ['repsDone', { ...session, sets: [{ ...session.sets[0], repsDone: 10 }] }],
    ['loadKg', { ...session, sets: [{ ...session.sets[0], loadKg: null }] }],
    ['completed', { ...session, sets: [{ ...session.sets[0], completed: 'no' }] }],
  ])('rejeita o campo estruturalmente inválido %s', async (_field, invalidSession) => {
    const exactKey = workoutSessionKey('user-a', 'day-a');
    const storage = memoryStorage({ [exactKey]: JSON.stringify(invalidSession) });
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.load('user-a', 'day-a')).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(exactKey);
  });

  it('propaga a falha do driver ao salvar o rascunho', async () => {
    const error = new Error('storage indisponível');
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn().mockRejectedValue(error),
    };
    const adapter = createWorkoutSessionStorage(storage);

    await expect(adapter.save('user-a', session)).rejects.toBe(error);
    expect(storage.setItem).toHaveBeenCalledWith(
      'muvit_workout_session:user-a:day-a',
      JSON.stringify(session),
    );
  });
});
