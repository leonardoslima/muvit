import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';
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
    const drain = async (): Promise<void> => {
      try {
        await journal.pruneTerminalsBefore(authUserId, todayIsoDate());
        await journal.drain(authUserId, () => api.bindCurrentSession());
      } catch {
        // O próximo foreground tenta novamente sem descartar o journal.
      }
    };

    void drain();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void drain();
    });

    return () => subscription.remove();
  }, [api, authUserId]);

  return null;
}
