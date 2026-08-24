import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { authClient } from '../lib/auth-client';
import { queryClient } from '../lib/query-client';
import { colors, fontFamilies, sharedStyles, spacing } from '../lib/styles';

export function ProfileScreen() {
  const session = authClient.useSession();
  const user = session.data?.user;
  const [logoutError, setLogoutError] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError(undefined);
    try {
      await authClient.signOut();
      router.replace('/(auth)/login');
    } catch {
      setLogoutError('Não foi possível sair agora.');
    } finally {
      queryClient.clear();
      setLoggingOut(false);
    }
  }

  if (session.isPending) {
    return (
      <Screen>
        <StatePanel
          description="Estamos carregando seus dados."
          title="Carregando perfil"
          tone="loading"
        />
      </Screen>
    );
  }

  const displayName = user?.name?.trim() || 'Aluno';
  const initials = getInitials(user?.name);

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader subtitle="Seu espaço para acompanhar a jornada." title="Perfil" />

      <Card style={styles.profileCard}>
        <View accessibilityLabel={`Iniciais de ${displayName}`} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={sharedStyles.subtitle}>{user?.email ?? 'Sem email cadastrado'}</Text>
        <Text style={styles.accountType}>Aluno independente</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Treinos e evolução</Text>
        <Text style={sharedStyles.subtitle}>
          Seus treinos e avaliações aparecem aqui conforme você avança.
        </Text>
      </Card>

      {logoutError ? (
        <Text accessibilityLiveRegion="polite" style={sharedStyles.error}>
          {logoutError}
        </Text>
      ) : null}
      <AppButton
        disabled={loggingOut}
        label={loggingOut ? 'Saindo...' : 'Sair'}
        onPress={() => void logout()}
        variant="secondary"
      />
    </Screen>
  );
}

function getInitials(name: string | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || 'AL';
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 24,
  },
  name: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  accountType: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 18,
  },
});
