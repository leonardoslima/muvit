import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { GuidedSession } from '../application/workouts/guided-session';
import {
  type TodayWorkoutResult,
  loadTodayWorkoutWithOfflineFallback,
} from '../application/workouts/today-workout';
import { authClient } from './auth-client';
import { isoDateFromTimestamp, todayIsoDate } from './date';
import { createWorkoutLogJournal } from './log-queue';
import type { CacheResult } from './offline-cache';
import { useApiClient } from './use-api';
import { createWorkoutSessionStorage } from './workout-session-storage';

export type TodayWorkoutQueryData = CacheResult<TodayWorkoutResult> & {
  completedLocal: boolean;
  draft: GuidedSession | null;
};

export function useTodayWorkout(): UseQueryResult<TodayWorkoutQueryData, Error> {
  const api = useApiClient();
  const authUserId = authClient.useSession().data?.user.id;

  return useQuery<TodayWorkoutQueryData, Error>({
    enabled: Boolean(authUserId),
    queryKey: ['today-workout', authUserId],
    queryFn: async ({ signal }) => {
      if (!authUserId) {
        throw new Error('Sessão não autenticada.');
      }

      const cached = await loadTodayWorkoutWithOfflineFallback({
        api,
        authUserId,
        storage: AsyncStorage,
      });
      const { data } = cached;

      if (data.status !== 'available') {
        return { ...cached, completedLocal: false, data, draft: null };
      }

      const sessionStorage = createWorkoutSessionStorage(AsyncStorage);
      let stored = await sessionStorage.load(authUserId, data.day.id);
      const journal = createWorkoutLogJournal(AsyncStorage);
      const currentDate = todayIsoDate();
      let operationDate = stored ? isoDateFromTimestamp(stored.session.startedAtMs) : currentDate;
      let hasJournalCompletion = await journal.hasForDay(authUserId, operationDate, data.day.id);
      if (stored?.kind === 'active' && hasJournalCompletion && operationDate < currentDate) {
        try {
          if (signal.aborted) throw new Error('Consulta do treino cancelada.');
          const removed = await sessionStorage.removeIfUnchanged(
            authUserId,
            data.day.id,
            stored.session.startedAtMs,
          );
          if (signal.aborted) throw new Error('Consulta do treino cancelada.');
          if (removed) {
            await journal.removeTerminal(authUserId, operationDate, data.day.id);
            if (signal.aborted) throw new Error('Consulta do treino cancelada.');
            stored = null;
            hasJournalCompletion = false;
          } else {
            stored = await sessionStorage.load(authUserId, data.day.id);
            operationDate = stored ? isoDateFromTimestamp(stored.session.startedAtMs) : currentDate;
            hasJournalCompletion = await journal.hasForDay(authUserId, operationDate, data.day.id);
          }
        } catch (error) {
          if (signal.aborted) throw error;
          // O terminal antigo continua protegendo o ciclo encerrado e a próxima montagem tenta limpar.
          stored = null;
          hasJournalCompletion = false;
        }
      }
      const completedLocal = hasJournalCompletion || stored?.session.phase === 'summary';
      if (completedLocal) return { ...cached, completedLocal, data, draft: null };

      return { ...cached, completedLocal: false, data, draft: stored?.session ?? null };
    },
  });
}
