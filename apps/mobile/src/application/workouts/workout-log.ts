import type { finishWorkoutLogSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';
import type { WorkoutLogJournal, WorkoutLogOperation } from '../../lib/log-queue';

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

export function buildFinishWorkoutLogInput(
  sets: WorkoutSetState[],
  durationMin: number,
): FinishWorkoutLogInput {
  return {
    durationMin,
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

export async function finishWorkoutWithOfflineFallback({
  ownerAuthUserId,
  journal,
  bindRequester,
  workoutDayId,
  date,
  durationMin,
  sets,
}: {
  ownerAuthUserId: string;
  journal: Pick<WorkoutLogJournal, 'ensure' | 'drain' | 'get'>;
  bindRequester: () => ApiRequester;
  workoutDayId: string;
  date: string;
  durationMin: number;
  sets: WorkoutSetState[];
}): Promise<{ queued: boolean }> {
  const operation: WorkoutLogOperation = {
    version: 1,
    operationId: `${ownerAuthUserId}:${date}:${workoutDayId}`,
    ownerAuthUserId,
    workoutDayId,
    date,
    finish: buildFinishWorkoutLogInput(sets, durationMin),
    stage: { kind: 'create' },
  };

  await journal.ensure(operation);
  await journal.drain(ownerAuthUserId, bindRequester);
  const persistedOperation = await journal.get(operation.operationId);

  return { queued: persistedOperation?.stage.kind !== 'terminal' };
}
