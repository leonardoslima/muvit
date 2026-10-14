import { workoutDayFullSchema } from '@muvit/validators';
import { type QueryClient, hashKey } from '@tanstack/react-query';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { WorkoutDay } from '../application/workouts/today-workout';

export type WorkoutExerciseSource = 'today' | 'overview';

export type WorkoutExerciseContext = {
  day: WorkoutDay;
  stale: boolean;
};

type GetWorkoutExerciseContextInput = {
  queryClient: QueryClient;
  authUserId: string;
  dayId: string;
  exerciseId: string;
  source: WorkoutExerciseSource;
};

type CachedTodayWorkout = {
  data?: {
    status?: string;
    day?: unknown;
  };
  stale?: boolean;
};

export function useWorkoutExerciseSourceVersion({
  queryClient,
  authUserId,
  dayId,
  source,
}: {
  queryClient: QueryClient;
  authUserId?: string;
  dayId?: string;
  source: WorkoutExerciseSource;
}): string {
  const queryKey = useMemo(
    () =>
      source === 'today'
        ? (['today-workout', authUserId] as const)
        : (['workout-overview', authUserId, dayId] as const),
    [authUserId, dayId, source],
  );
  const queryHash = hashKey(queryKey);
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === queryHash) onStoreChange();
      }),
    [queryClient, queryHash],
  );
  const getSnapshot = useCallback(() => {
    const state = queryClient.getQueryState(queryKey);
    return `${state?.dataUpdateCount ?? 0}:${state?.dataUpdatedAt ?? 0}:${state?.isInvalidated === true ? 1 : 0}`;
  }, [queryClient, queryKey]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getWorkoutExerciseContext({
  queryClient,
  authUserId,
  dayId,
  exerciseId,
  source,
}: GetWorkoutExerciseContextInput): WorkoutExerciseContext | undefined {
  if (!authUserId || !dayId || !exerciseId) return undefined;

  const queryKey =
    source === 'today'
      ? (['today-workout', authUserId] as const)
      : (['workout-overview', authUserId, dayId] as const);
  const queryState = queryClient.getQueryState(queryKey);
  let candidate: unknown;
  let cacheStale = false;

  if (source === 'today') {
    const cached = queryClient.getQueryData<CachedTodayWorkout>(queryKey);
    if (cached?.data?.status !== 'available') return undefined;
    candidate = cached.data.day;
    cacheStale = cached.stale === true;
  } else {
    candidate = queryClient.getQueryData<unknown>(queryKey);
  }

  const parsedDay = workoutDayFullSchema.safeParse(candidate);
  if (!parsedDay.success || parsedDay.data.id !== dayId) return undefined;
  if (!parsedDay.data.exercises.some((item) => item.id === exerciseId)) return undefined;

  return { day: parsedDay.data, stale: cacheStale || queryState?.isInvalidated === true };
}
