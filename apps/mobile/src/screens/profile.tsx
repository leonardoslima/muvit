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
import { colors, controlSizes, fontFamilies, radii, spacing, typography } from '../lib/styles';

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
  const isTrainerProfile = accountType === 'Treinador';
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
    <Screen
      scroll
      contentContainerStyle={[styles.content, isTrainerProfile ? styles.trainerContent : null]}
    >
      {isTrainerProfile ? (
        <ProfileHeader subtitle={subtitle} />
      ) : (
        <ScreenHeader eyebrow="PERFIL" subtitle={subtitle} title="Meu perfil" />
      )}

      <Card
        style={[styles.identityCard, isTrainerProfile ? styles.trainerIdentityCard : null]}
        testID="profile-identity-card"
      >
        <View
          accessibilityLabel={`Iniciais de ${displayName}`}
          style={styles.avatar}
          testID="profile-avatar"
        >
          <Text style={[styles.avatarText, isTrainerProfile ? styles.trainerAvatarText : null]}>
            {initials}
          </Text>
        </View>
        {isTrainerProfile ? (
          <View style={styles.identityCopy} testID="profile-identity-copy">
            <Text style={[styles.name, styles.trainerName]}>{displayName}</Text>
            <Text style={styles.trainerEmail}>{user?.email ?? 'Sem email cadastrado'}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user?.email ?? 'Sem email cadastrado'}</Text>
          </>
        )}
        {isTrainerProfile ? (
          <View
            accessibilityLabel={`Papel da conta: ${accountType}`}
            style={styles.trainerRoleBadge}
            testID="profile-role-badge"
          >
            <View
              accessibilityLabel="Papel da conta"
              style={styles.trainerRoleDot}
              testID="profile-role-dot"
            />
            <Text style={styles.trainerRoleBadgeText}>{accountType}</Text>
          </View>
        ) : (
          <StatusBadge
            backgroundColor={colors.primarySoft}
            label={accountType}
            style={styles.roleBadge}
            testID="profile-role-badge"
            textColor={colors.primaryText}
          />
        )}
      </Card>

      <Card
        style={[styles.detailsCard, isTrainerProfile ? styles.trainerDetailsCard : null]}
        testID="profile-details-card"
      >
        <ProfileDetailRow
          icon="person-circle-outline"
          iconTestID="profile-account-icon"
          isTrainerProfile={isTrainerProfile}
          label="Tipo de conta"
          trainerIcon={isTrainerProfile ? 'person-outline' : undefined}
          value={accountType}
        />
        <ProfileDetailRow
          icon="barbell-outline"
          iconTestID="profile-access-icon"
          isTrainerProfile={isTrainerProfile}
          label="Acesso"
          trainerIcon={isTrainerProfile ? 'people-outline' : undefined}
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
  isTrainerProfile?: boolean;
  label: string;
  trainerIcon?: ComponentProps<typeof Ionicons>['name'];
  value: string;
};

function ProfileDetailRow({
  icon,
  iconTestID,
  isTrainerProfile = false,
  label,
  trainerIcon,
  value,
}: ProfileDetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons
        accessible={false}
        color={isTrainerProfile ? colors.primary : colors.primaryText}
        name={isTrainerProfile && trainerIcon ? trainerIcon : icon}
        size={18}
        testID={iconTestID}
      />
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, isTrainerProfile ? styles.trainerDetailLabel : null]}>
          {label}
        </Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ProfileHeader({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.header} testID="profile-header">
      <Text style={styles.eyebrow}>PERFIL</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Meu perfil
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
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
  trainerContent: {
    gap: 18,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 11,
    letterSpacing: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  identityCard: {
    alignItems: 'center',
    borderRadius: radii.control,
    padding: spacing.xl,
  },
  trainerIdentityCard: {
    borderRadius: radii.md,
    padding: 22,
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
  trainerAvatarText: {
    fontWeight: '700',
  },
  name: {
    color: colors.ink,
    ...typography.title,
    textAlign: 'center',
  },
  trainerName: {
    fontWeight: '700',
  },
  email: {
    color: colors.muted,
    ...typography.labelCompact,
    textAlign: 'center',
  },
  identityCopy: {
    alignItems: 'center',
    gap: 4,
  },
  trainerEmail: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    textAlign: 'center',
  },
  roleBadge: {
    alignSelf: 'center',
  },
  trainerRoleBadge: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trainerRoleBadgeText: {
    color: '#3498DB',
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 11,
  },
  trainerRoleDot: {
    backgroundColor: '#3498DB',
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  detailsCard: {
    borderRadius: radii.control,
    gap: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  trainerDetailsCard: {
    borderRadius: radii.md,
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
  trainerDetailLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  detailValue: {
    color: colors.ink,
    ...typography.labelCompact,
  },
});
