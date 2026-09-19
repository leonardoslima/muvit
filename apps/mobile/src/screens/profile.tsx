import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { StatusBadge } from '../components/ui/status-badge';
import { authClient } from '../lib/auth-client';
import { queryClient } from '../lib/query-client';
import { colors, controlSizes, radii, spacing, typography } from '../lib/styles';

export type ProfileScreenProps = {
  accessDescription?: string;
  accountType?: string;
  fallbackInitials?: string;
  fallbackName?: string;
  subtitle?: string;
};

export function ProfileScreen({
  accessDescription = 'Treinos e evolução',
  accountType = 'Aluno independente',
  fallbackInitials = 'AL',
  fallbackName = 'Aluno',
  subtitle = 'Seus dados e preferências de conta.',
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
      <ScreenHeader eyebrow="PERFIL" subtitle={subtitle} title="Meu perfil" />

      <Card style={styles.identityCard} testID="profile-identity-card">
        <View
          accessibilityLabel={`Iniciais de ${displayName}`}
          style={styles.avatar}
          testID="profile-avatar"
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email ?? 'Sem email cadastrado'}</Text>
        <StatusBadge
          backgroundColor={colors.primarySoft}
          label={accountType}
          style={styles.roleBadge}
          testID="profile-role-badge"
          textColor={colors.primaryText}
        />
      </Card>

      <Card style={styles.detailsCard} testID="profile-details-card">
        <ProfileDetailRow
          icon="person-circle-outline"
          iconTestID="profile-account-icon"
          label="Tipo de conta"
          value={accountType}
        />
        <ProfileDetailRow
          icon="barbell-outline"
          iconTestID="profile-access-icon"
          label="Acesso"
          value={accessDescription}
        />
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

type ProfileDetailRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconTestID: string;
  label: string;
  value: string;
};

function ProfileDetailRow({ icon, iconTestID, label, value }: ProfileDetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons
        accessible={false}
        color={colors.primaryText}
        name={icon}
        size={18}
        testID={iconTestID}
      />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
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
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  identityCard: {
    alignItems: 'center',
    borderRadius: radii.control,
    padding: spacing.xl,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: controlSizes.profileAvatar,
    justifyContent: 'center',
    width: controlSizes.profileAvatar,
  },
  avatarText: {
    color: colors.ink,
    ...typography.headline,
  },
  name: {
    color: colors.ink,
    ...typography.title,
    textAlign: 'center',
  },
  email: {
    color: colors.muted,
    ...typography.labelCompact,
    textAlign: 'center',
  },
  roleBadge: {
    alignSelf: 'center',
  },
  detailsCard: {
    borderRadius: radii.control,
    gap: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: controlSizes.profileDetailRow,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  detailLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  detailValue: {
    color: colors.ink,
    ...typography.labelCompact,
  },
});
