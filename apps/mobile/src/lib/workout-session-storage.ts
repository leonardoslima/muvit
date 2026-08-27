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

export function workoutSessionKey(authUserId: string, workoutDayId: string): string {
  return `muvit_workout_session:${authUserId}:${workoutDayId}`;
}

export function createWorkoutSessionStorage(storage: SessionStorageDriver): WorkoutSessionStorage {
  return {
    async load(authUserId, workoutDayId) {
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
    },

    async remove(authUserId, workoutDayId) {
      await storage.removeItem(workoutSessionKey(authUserId, workoutDayId));
    },

    async save(authUserId, day, session) {
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

      await storage.setItem(workoutSessionKey(authUserId, day.id), JSON.stringify(record));
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
