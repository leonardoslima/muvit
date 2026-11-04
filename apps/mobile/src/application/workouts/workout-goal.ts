import { updateWorkoutGoalSchema, workoutGoalSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export type WorkoutGoal = z.infer<typeof workoutGoalSchema>;

export async function loadWorkoutGoal(
  api: ApiRequester,
  signal?: AbortSignal,
): Promise<WorkoutGoal> {
  return workoutGoalSchema.parse(
    await api.request<unknown>('/students/me/workout-goal', { signal }),
  );
}

export async function saveWorkoutGoal(
  api: ApiRequester,
  weeklyGoal: number | null,
): Promise<WorkoutGoal> {
  const input = updateWorkoutGoalSchema.parse({ weeklyGoal });
  return workoutGoalSchema.parse(
    await api.request<unknown>('/students/me/workout-goal', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
}
