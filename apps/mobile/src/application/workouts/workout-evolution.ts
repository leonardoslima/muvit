import { workoutEvolutionSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export type WorkoutEvolution = z.infer<typeof workoutEvolutionSchema>;

export async function loadWorkoutEvolution({
  api,
  today,
  signal,
}: { api: ApiRequester; today: string; signal?: AbortSignal }): Promise<WorkoutEvolution> {
  return workoutEvolutionSchema.parse(
    await api.request<unknown>(`/students/me/workout-evolution?date=${today}`, { signal }),
  );
}
