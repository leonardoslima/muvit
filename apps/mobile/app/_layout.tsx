import { QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Slot, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PushTokenRegistration } from '../src/components/push-token-registration';
import { QueueDrain } from '../src/components/queue-drain';
import { useAuth } from '../src/lib/auth-store';
import { queryClient } from '../src/lib/query-client';
import { colors } from '../src/lib/styles';

export default function RootLayout() {
  const segments = useSegments();
  const hydrate = useAuth((state) => state.hydrate);
  const hydrated = useAuth((state) => state.hydrated);
  const accessToken = useAuth((state) => state.accessToken);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const routeGroup = segments[0];
  if (!accessToken && routeGroup !== '(auth)') return <Redirect href="/(auth)/login" />;
  if (accessToken && routeGroup === '(auth)') return <Redirect href="/(tabs)" />;

  return (
    <QueryClientProvider client={queryClient}>
      {accessToken ? <QueueDrain /> : null}
      {accessToken ? <PushTokenRegistration /> : null}
      <StatusBar style="dark" />
      <Slot />
    </QueryClientProvider>
  );
}
