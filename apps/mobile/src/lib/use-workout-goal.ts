import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadWorkoutGoal, saveWorkoutGoal } from '../application/workouts/workout-goal';
import type { ApiRequester } from './api';
import { authClient } from './auth-client';
import { invalidateWorkoutEvolution } from './invalidate-workout-evolution';
import { useApiClient } from './use-api';

type GoalMutation = { weeklyGoal: number | null; ownerAuthUserId: string; requester: ApiRequester };

export function useWorkoutGoal() {
  const api = useApiClient();
  const client = useQueryClient();
  const ownerAuthUserId = authClient.useSession().data?.user.id;
  const query = useQuery({
    queryKey: ['workout-goal', ownerAuthUserId],
    enabled: Boolean(ownerAuthUserId),
    queryFn: ({ signal }) => loadWorkoutGoal(api.bindCurrentSession(), signal),
  });
  const mutation = useMutation({
    mutationFn: ({ requester, weeklyGoal }: GoalMutation) => saveWorkoutGoal(requester, weeklyGoal),
    onSuccess: async (data, input) => {
      await client.cancelQueries({ queryKey: ['workout-goal', input.ownerAuthUserId] });
      client.setQueryData(['workout-goal', input.ownerAuthUserId], data);
      void invalidateWorkoutEvolution(client, input.ownerAuthUserId);
    },
  });

  async function save(weeklyGoal: number | null) {
    if (!ownerAuthUserId) throw new Error('Sessão não autenticada.');
    return mutation.mutateAsync({
      weeklyGoal,
      ownerAuthUserId,
      requester: api.bindCurrentSession(),
    });
  }

  return { query, save, saving: mutation.isPending };
}
