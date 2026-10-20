import { useQuery } from '@tanstack/react-query';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { loadWorkoutEvolution } from '../application/workouts/workout-evolution';
import { authClient } from './auth-client';
import { todayIsoDate } from './date';
import { useApiClient } from './use-api';

export function useWorkoutEvolution() {
  const api = useApiClient();
  const navigation = useNavigation();
  const authUserId = authClient.useSession().data?.user.id;
  const today = todayIsoDate();
  const query = useQuery({
    queryKey: ['workout-evolution', authUserId, today],
    enabled: Boolean(authUserId),
    queryFn: ({ signal }) => loadWorkoutEvolution({ api: api.bindCurrentSession(), today, signal }),
  });

  useEffect(
    () =>
      navigation.addListener?.('focus', () => {
        void query.refetch();
      }),
    [navigation, query.refetch],
  );

  return query;
}
