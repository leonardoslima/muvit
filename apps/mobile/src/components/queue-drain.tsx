import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createLogQueue, sendPendingWorkoutLog } from '../lib/log-queue';
import { useApiClient } from '../lib/use-api';

export function QueueDrain() {
  const api = useApiClient();

  useEffect(() => {
    const queue = createLogQueue(AsyncStorage);
    const drain = () => queue.drain((item) => sendPendingWorkoutLog(api, item));

    void drain();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void drain();
    });

    return () => subscription.remove();
  }, [api]);

  return null;
}
