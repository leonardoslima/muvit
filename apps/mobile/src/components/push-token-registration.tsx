import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { registerPushToken } from '../lib/push-token';
import { useApiClient } from '../lib/use-api';

export function PushTokenRegistration() {
  const api = useApiClient();

  useEffect(() => {
    void registerPushToken({
      api,
      getPermissions: Notifications.getPermissionsAsync,
      requestPermissions: Notifications.requestPermissionsAsync,
      getExpoPushToken: Notifications.getExpoPushTokenAsync,
    });
  }, [api]);

  return null;
}
