import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { authClient } from '../lib/auth-client';
import { queryClient } from '../lib/query-client';
import { colors, controlSizes, radii, sharedStyles, spacing, typography } from '../lib/styles';

export type ProfileScreenProps = {
  accountType?: string;
  fallbackInitials?: string;
  fallbackName?: string;
  journeyDescription?: string;
};

export function ProfileScreen({
  accountType = 'Aluno independente',
  fallbackInitials = 'AL',
  fallbackName = 'Aluno',
  journeyDescription = 'Seus treinos e avaliações aparecem aqui conforme você avança.',
}: ProfileScreenProps = {}) {
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

  const displayName = user?.name?.trim() || fallbackName;
  const initials = getInitials(user?.name, fallbackInitials);

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader subtitle="Seu espaço para acompanhar a jornada." title="Perfil" />

      <Card style={styles.profileCard}>
        <View accessibilityLabel={`Iniciais de ${displayName}`} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={sharedStyles.subtitle}>{user?.email ?? 'Sem email cadastrado'}</Text>
        <Text style={styles.accountType}>{accountType}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Treinos e evolução</Text>
        <Text style={sharedStyles.subtitle}>{journeyDescription}</Text>
      </Card>

      {logoutError ? <InlineMessage message={logoutError} tone="error" /> : null}
      <AppButton
        disabled={loggingOut}
        label={loggingOut ? 'Saindo...' : 'Sair'}
        onPress={() => void logout()}
        variant="secondary"
      />
    </Screen>
  );
}

function getInitials(name: string | undefined, fallbackInitials: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || fallbackInitials;
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
    borderRadius: radii.avatar,
    height: controlSizes.avatar,
    justifyContent: 'center',
    width: controlSizes.avatar,
  },
  avatarText: {
    color: colors.ink,
    ...typography.brandCompact,
  },
  name: {
    color: colors.ink,
    ...typography.title,
    textAlign: 'center',
  },
  accountType: {
    color: colors.primaryText,
    ...typography.bodyStrong,
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.exerciseTitle,
  },
});
