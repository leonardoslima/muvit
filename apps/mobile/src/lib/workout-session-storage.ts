import { z } from 'zod';
import type { GuidedSession } from '../application/workouts/guided-session';

export type SessionStorageDriver = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type WorkoutSessionStorage = {
  load: (authUserId: string, workoutDayId: string) => Promise<GuidedSession | null>;
  remove: (authUserId: string, workoutDayId: string) => Promise<void>;
  save: (authUserId: string, session: GuidedSession) => Promise<void>;
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

      const result = guidedSessionSchema.safeParse(parsed);
      if (!result.success || result.data.workoutDayId !== workoutDayId) {
        await storage.removeItem(key);
        return null;
      }

      return result.data;
    },

    async remove(authUserId, workoutDayId) {
      await storage.removeItem(workoutSessionKey(authUserId, workoutDayId));
    },

    async save(authUserId, session) {
      const validatedSession = guidedSessionSchema.parse(session);
      await storage.setItem(
        workoutSessionKey(authUserId, session.workoutDayId),
        JSON.stringify(validatedSession),
      );
    },
  };
}
