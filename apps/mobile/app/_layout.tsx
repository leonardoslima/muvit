import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Redirect, Slot, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import * as Sentry from 'sentry-expo';
import {
  resolveRouteAccess,
  resolveRouteArea,
} from '../src/application/navigation/role-navigation';
import { UnsupportedRoleBoundary } from '../src/components/navigation/unsupported-role-boundary';
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

function AuthenticatedRootLayout() {
  const segments = useSegments();
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Carregando sessão" color={colors.primary} />
      </View>
    );
  }

  const decision = resolveRouteAccess({
    area: resolveRouteArea(segments),
    isAuthenticated: Boolean(session.data),
    role: session.data?.user.role,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      {decision.kind === 'unsupported-role' ? <UnsupportedRoleBoundary /> : null}
      {decision.kind === 'redirect' ? <Redirect href={decision.href} /> : null}
      {decision.kind === 'allow' ? <Slot /> : null}
    </QueryClientProvider>
  );
}

export function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    SpaceGrotesk_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Carregando aplicativo" color={colors.primary} />
      </View>
    );
  }

  return <AuthenticatedRootLayout />;
}

export default Sentry.Native.wrap(RootLayout);
