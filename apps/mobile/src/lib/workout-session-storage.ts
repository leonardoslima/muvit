import { workoutDayFullSchema } from '@muvit/validators';
import { z } from 'zod';
import type { GuidedSession } from '../application/workouts/guided-session';
import type { WorkoutDay } from '../application/workouts/today-workout';

export type SessionStorageDriver = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type WorkoutSessionStorage = {
  load: (authUserId: string, workoutDayId: string) => Promise<StoredWorkoutSession | null>;
  remove: (authUserId: string, workoutDayId: string) => Promise<void>;
  removeIfUnchanged: (
    authUserId: string,
    workoutDayId: string,
    expectedStartedAtMs: number,
  ) => Promise<boolean>;
  save: (authUserId: string, day: WorkoutDay, session: GuidedSession) => Promise<void>;
};

export type StoredWorkoutSession =
  | {
      kind: 'active';
      version: 2;
      ownerAuthUserId: string;
      day: WorkoutDay;
      session: GuidedSession;
    }
  | {
      kind: 'legacy';
      version: 1;
      session: GuidedSession;
    };

const timestampSchema = z.number().finite().nonnegative();
const indexSchema = z.number().int().nonnegative();

const workoutSetStateSchema = z
  .object({
    workoutExerciseId: z.string().min(1),
    setNumber: z.number().int().positive(),
    repsDone: z.string(),
    loadKg: z.string(),
    completed: z.boolean(),
  })
  .strict();

const guidedSessionSchema = z
  .object({
    version: z.literal(2),
    workoutDayId: z.string().min(1),
    startedAtMs: timestampSchema,
    updatedAtMs: timestampSchema,
    activeDurationMs: timestampSchema,
    activeSinceMs: timestampSchema.nullable(),
    currentExerciseIndex: indexSchema,
    currentSetIndex: indexSchema,
    phase: z.enum(['set', 'rest', 'exercise-complete', 'ready-to-finish', 'summary']),
    restEndsAtMs: timestampSchema.nullable(),
    sets: z.array(workoutSetStateSchema),
  })
  .strict();

const legacyGuidedSessionSchema = z
  .object({
    version: z.literal(1),
    workoutDayId: z.string().min(1),
    startedAtMs: timestampSchema,
    updatedAtMs: timestampSchema,
    currentExerciseIndex: indexSchema,
    currentSetIndex: indexSchema,
    phase: z.enum(['set', 'rest', 'exercise-complete', 'ready-to-finish', 'summary']),
    restEndsAtMs: timestampSchema.nullable(),
    sets: z.array(workoutSetStateSchema),
  })
  .strict();

const activeWorkoutSessionSchema = z
  .object({
    kind: z.literal('active'),
    version: z.literal(2),
    ownerAuthUserId: z.string().min(1),
    day: workoutDayFullSchema,
    session: guidedSessionSchema,
  })
  .strict();

const sessionStorageTails = new WeakMap<SessionStorageDriver, Map<string, Promise<void>>>();
const retiredSessionGenerations = new WeakMap<SessionStorageDriver, Set<string>>();

function sessionGenerationKey(
  authUserId: string,
  workoutDayId: string,
  startedAtMs: number,
): string {
  return `${workoutSessionKey(authUserId, workoutDayId)}:${startedAtMs}`;
}

function serializeSessionStorageOperation<T>(
  storage: SessionStorageDriver,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const tails = sessionStorageTails.get(storage) ?? new Map<string, Promise<void>>();
  sessionStorageTails.set(storage, tails);
  const result = (tails.get(key) ?? Promise.resolve()).then(operation, operation);
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  tails.set(key, tail);
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return result;
}

function retiredGenerationsFor(storage: SessionStorageDriver): Set<string> {
  const generations = retiredSessionGenerations.get(storage) ?? new Set<string>();
  retiredSessionGenerations.set(storage, generations);
  return generations;
}

export function workoutSessionKey(authUserId: string, workoutDayId: string): string {
  return `muvit_workout_session:${authUserId}:${workoutDayId}`;
}

async function loadStoredSession(
  storage: SessionStorageDriver,
  authUserId: string,
  workoutDayId: string,
): Promise<StoredWorkoutSession | null> {
  const key = workoutSessionKey(authUserId, workoutDayId);
  const serialized = await storage.getItem(key);
  if (serialized === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    await storage.removeItem(key);
    return null;
  }

  const activeResult = activeWorkoutSessionSchema.safeParse(parsed);
  if (activeResult.success) {
    if (!matchesRequestedSession(activeResult.data, authUserId, workoutDayId)) {
      await storage.removeItem(key);
      return null;
    }

    return activeResult.data;
  }

  const legacyResult = legacyGuidedSessionSchema.safeParse(parsed);
  if (!legacyResult.success || legacyResult.data.workoutDayId !== workoutDayId) {
    await storage.removeItem(key);
    return null;
  }

  return {
    kind: 'legacy',
    version: 1,
    session: normalizeLegacySession(legacyResult.data),
  };
}

export function createWorkoutSessionStorage(storage: SessionStorageDriver): WorkoutSessionStorage {
  return {
    load(authUserId, workoutDayId) {
      return loadStoredSession(storage, authUserId, workoutDayId);
    },

    remove(authUserId, workoutDayId) {
      const key = workoutSessionKey(authUserId, workoutDayId);
      return serializeSessionStorageOperation(storage, key, () => storage.removeItem(key));
    },

    removeIfUnchanged(authUserId, workoutDayId, expectedStartedAtMs) {
      const key = workoutSessionKey(authUserId, workoutDayId);
      return serializeSessionStorageOperation(storage, key, async () => {
        const stored = await loadStoredSession(storage, authUserId, workoutDayId);
        if (
          stored?.kind !== 'active' ||
          stored.ownerAuthUserId !== authUserId ||
          stored.day.id !== workoutDayId ||
          stored.session.workoutDayId !== workoutDayId ||
          stored.session.startedAtMs !== expectedStartedAtMs
        ) {
          return false;
        }

        await storage.removeItem(key);
        retiredGenerationsFor(storage).add(
          sessionGenerationKey(authUserId, workoutDayId, expectedStartedAtMs),
        );
        return true;
      });
    },

    save(authUserId, day, session) {
      const key = workoutSessionKey(authUserId, day.id);
      return serializeSessionStorageOperation(storage, key, async () => {
        const record = activeWorkoutSessionSchema.parse({
          kind: 'active',
          version: 2,
          ownerAuthUserId: authUserId,
          day,
          session,
        });
        if (!matchesRequestedSession(record, authUserId, day.id)) {
          throw new Error('registro da sessão não corresponde ao treino.');
        }
        if (
          retiredGenerationsFor(storage).has(
            sessionGenerationKey(authUserId, day.id, session.startedAtMs),
          )
        ) {
          throw new Error('rascunho já foi encerrado.');
        }

        await storage.setItem(key, JSON.stringify(record));
      });
    },
  };
}

function matchesRequestedSession(
  record: z.infer<typeof activeWorkoutSessionSchema>,
  authUserId: string,
  workoutDayId: string,
): boolean {
  return (
    record.ownerAuthUserId === authUserId &&
    record.day.id === workoutDayId &&
    record.session.workoutDayId === workoutDayId
  );
}

function normalizeLegacySession(session: z.infer<typeof legacyGuidedSessionSchema>): GuidedSession {
  return {
    ...session,
    version: 2,
    activeDurationMs: Math.max(0, session.updatedAtMs - session.startedAtMs),
    activeSinceMs: null,
  };
}
