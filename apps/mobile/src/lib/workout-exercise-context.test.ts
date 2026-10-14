import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { getWorkoutExerciseContext } from './workout-exercise-context';

const day = {
  id: '22222222-2222-4222-8222-222222222222',
  planId: '44444444-4444-4444-8444-444444444444',
  label: 'Treino A',
  dayOrder: 0,
  exercises: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      workoutDayId: '22222222-2222-4222-8222-222222222222',
      exerciseId: '33333333-3333-4333-8333-333333333333',
      exerciseOrder: 0,
      sets: 3,
      reps: '10',
      loadKg: null,
      restSeconds: 60,
      tempo: null,
      notes: null,
      exercise: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Supino reto',
        muscleGroup: 'chest',
      },
    },
  ],
};

function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('getWorkoutExerciseContext', () => {
  it('reads only the cache selected by the origin', () => {
    const queryClient = createQueryClient();
    const todayDay = { ...day, label: 'Dia de Hoje' };
    const overviewDay = { ...day, label: 'Dia da visão geral' };
    queryClient.setQueryData(['today-workout', 'auth-user-a'], {
      data: { status: 'available', day: todayDay, plan: {} },
      stale: false,
    });
    queryClient.setQueryData(['workout-overview', 'auth-user-a', day.id], overviewDay);

    expect(
      getWorkoutExerciseContext({
        queryClient,
        authUserId: 'auth-user-a',
        dayId: day.id,
        exerciseId: day.exercises[0].id,
        source: 'today',
      })?.day.label,
    ).toBe('Dia de Hoje');
    expect(
      getWorkoutExerciseContext({
        queryClient,
        authUserId: 'auth-user-a',
        dayId: day.id,
        exerciseId: day.exercises[0].id,
        source: 'overview',
      })?.day.label,
    ).toBe('Dia da visão geral');
  });

  it('rejects a different user, day, or prescription exercise ID', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['workout-overview', 'auth-user-a', day.id], day);

    const base = {
      queryClient,
      authUserId: 'auth-user-a',
      dayId: day.id,
      exerciseId: day.exercises[0].id,
      source: 'overview' as const,
    };

    expect(getWorkoutExerciseContext({ ...base, authUserId: 'auth-user-b' })).toBeUndefined();
    expect(
      getWorkoutExerciseContext({ ...base, dayId: '99999999-9999-4999-8999-999999999999' }),
    ).toBeUndefined();
    expect(
      getWorkoutExerciseContext({ ...base, exerciseId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    ).toBeUndefined();
  });

  it('keeps a valid stale Today prescription available offline', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['today-workout', 'auth-user-a'], {
      data: { status: 'available', day, plan: {} },
      stale: true,
    });

    expect(
      getWorkoutExerciseContext({
        queryClient,
        authUserId: 'auth-user-a',
        dayId: day.id,
        exerciseId: day.exercises[0].id,
        source: 'today',
      }),
    ).toEqual({ day, stale: true });
  });
});
