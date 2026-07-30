import type { finishWorkoutLogSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { PendingWorkoutLog } from '../../lib/log-queue';

type FinishWorkoutLogInput = z.infer<typeof finishWorkoutLogSchema>;

export type WorkoutSetState = {
  workoutExerciseId: string;
  setNumber: number;
  repsDone: string;
  loadKg: string;
  completed: boolean;
};

type WorkoutExerciseForSets = {
  id: string;
  sets: number;
  loadKg: string | number | null;
};

type Queue = {
  enqueue: (item: PendingWorkoutLog) => Promise<void>;
};

type SendPendingWorkoutLog<TApi> = (api: TApi, item: PendingWorkoutLog) => Promise<void>;

export function buildInitialSets(exercises: WorkoutExerciseForSets[]): WorkoutSetState[] {
  return exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, index) => ({
      workoutExerciseId: exercise.id,
      setNumber: index + 1,
      repsDone: '',
      loadKg: exercise.loadKg === null ? '' : String(exercise.loadKg),
      completed: false,
    })),
  );
}

export function groupSetsByExercise(sets: WorkoutSetState[]): Map<string, WorkoutSetState[]> {
  const groups = new Map<string, WorkoutSetState[]>();
  for (const set of sets) {
    groups.set(set.workoutExerciseId, [...(groups.get(set.workoutExerciseId) ?? []), set]);
  }
  return groups;
}

export function toOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildFinishWorkoutLogInput(sets: WorkoutSetState[]): FinishWorkoutLogInput {
  return {
    durationMin: 45,
    completed: true,
    sets: sets.map((set) => ({
      workoutExerciseId: set.workoutExerciseId,
      setNumber: set.setNumber,
      repsDone: toOptionalNumber(set.repsDone),
      loadKg: toOptionalNumber(set.loadKg),
      completed: set.completed,
    })),
  };
}

export async function finishWorkoutWithOfflineFallback<TApi>({
  api,
  queue,
  send,
  workoutDayId,
  date,
  sets,
}: {
  api: TApi;
  queue: Queue;
  send: SendPendingWorkoutLog<TApi>;
  workoutDayId: string;
  date: string;
  sets: WorkoutSetState[];
}): Promise<{ queued: boolean }> {
  const item: PendingWorkoutLog = {
    workoutDayId,
    date,
    finish: buildFinishWorkoutLogInput(sets),
  };

  try {
    await send(api, item);
    return { queued: false };
  } catch {
    await queue.enqueue(item);
    return { queued: true };
  }
}
