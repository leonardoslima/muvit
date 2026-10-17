import { useQuery } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import { useCallback, useRef } from 'react';
import { loadSessionExerciseMedia } from '../application/exercises/session-exercise-media';
import { useApiClient } from './use-api';

export type UseSessionExerciseMediaInput = {
  authUserId?: string;
  dayId?: string;
  exerciseId?: string;
  enabled: boolean;
};

export function useSessionExerciseMedia({
  authUserId,
  dayId,
  exerciseId,
  enabled,
}: UseSessionExerciseMediaInput) {
  const api = useApiClient();
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const hasContext = Boolean(authUserId && dayId && exerciseId);
  const canLoad = enabled && hasContext && !offline;
  const retryingContexts = useRef(new Set<string>());
  const retryContext = JSON.stringify([authUserId ?? null, dayId ?? null, exerciseId ?? null]);

  const query = useQuery({
    queryKey: ['session-exercise-media', authUserId, dayId, exerciseId] as const,
    enabled: canLoad,
    retry: false,
    queryFn: ({ signal }) => {
      if (!authUserId || !dayId || !exerciseId) {
        throw new Error('Não foi possível buscar a demonstração deste exercício.');
      }
      return loadSessionExerciseMedia(api, exerciseId, signal);
    },
  });

  const retry = useCallback(() => {
    if (!canLoad || query.isFetching || retryingContexts.current.has(retryContext)) return;
    retryingContexts.current.add(retryContext);
    void query.refetch().finally(() => {
      retryingContexts.current.delete(retryContext);
    });
  }, [canLoad, query, retryContext]);

  return {
    data: query.data,
    error: query.error,
    isLoading: canLoad && query.isPending,
    isFetching: query.isFetching,
    offline,
    retry,
  };
}
