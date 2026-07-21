import { QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Slot, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import * as Sentry from 'sentry-expo';
import { PushTokenRegistration } from '../src/components/push-token-registration';
import { QueueDrain } from '../src/components/queue-drain';
import { authClient } from '../src/lib/auth-client';
import { queryClient } from '../src/lib/query-client';
import { colors } from '../src/lib/styles';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

export function RootLayout() {
  const segments = useSegments();
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Carregando sessão" color={colors.primary} />
      </View>
    );
  }

  const routeGroup = segments[0];
  const isAuthenticatedStudent = session.data?.user.role === 'student';

  if (!isAuthenticatedStudent && routeGroup !== '(auth)') {
    return <Redirect href="/(auth)/login" />;
  }
  if (isAuthenticatedStudent && routeGroup === '(auth)') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticatedStudent ? <QueueDrain /> : null}
      {isAuthenticatedStudent ? <PushTokenRegistration /> : null}
      <StatusBar style="dark" />
      <Slot />
    </QueryClientProvider>
  );
}

export default Sentry.Native.wrap(RootLayout);
