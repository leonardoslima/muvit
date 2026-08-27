import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { ApiRequester } from '../lib/api';
import { authClient } from '../lib/auth-client';
import { todayIsoDate } from '../lib/date';
import { createWorkoutLogJournal } from '../lib/log-queue';
import { useApiClient } from '../lib/use-api';

export function QueueDrain() {
  const api = useApiClient();
  const authUserId = authClient.useSession().data?.user.id;

  useEffect(() => {
    if (!authUserId) return;

    const journal = createWorkoutLogJournal(AsyncStorage);
    const drain = async (requester: ApiRequester): Promise<void> => {
      try {
        await journal.pruneTerminalsBefore(authUserId, todayIsoDate());
        await journal.drain(authUserId, () => requester);
      } catch {
        // O próximo foreground tenta novamente sem descartar o journal.
      }
    };
    const drainCurrentSession = (): void => {
      try {
        const requester = api.bindCurrentSession();
        void drain(requester);
      } catch {
        // O próximo foreground tenta novamente com a sessão então vigente.
      }
    };

    drainCurrentSession();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') drainCurrentSession();
    });

    return () => subscription.remove();
  }, [api, authUserId]);

  return null;
}
