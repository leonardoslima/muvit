import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type TrainerStudent, getTrainerStudent } from '../application/trainer/trainer-data';
import { StudentStatusBadge, studentStatusLabel } from '../components/trainer/student-status-badge';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { ApiError } from '../lib/api';
import { colors, fontFamilies, radii, spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerStudentDetailScreen() {
  const api = useApiClient();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const query = useQuery({
    enabled: Boolean(studentId),
    queryKey: ['trainer', 'student', studentId],
    queryFn: ({ signal }) => {
      if (!studentId) {
        throw new Error('Aluno inválido.');
      }

      return getTrainerStudent(api, studentId, signal);
    },
  });

  if (!studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para alunos"
          description="Não foi possível identificar o aluno solicitado."
          onAction={returnToStudents}
          title="Aluno inválido"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View accessibilityLabel="Carregando aluno" accessible style={styles.stateContent}>
          <DetailLoadingSkeleton />
        </View>
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;

  if (isNotFound) {
    return (
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <StudentDetailStateHeader />
          <DetailStatePanel
            actionLabel="Voltar para alunos"
            description="Este aluno não está disponível para sua conta."
            onAction={returnToStudents}
            title="Aluno não encontrado"
            tone="error"
          />
        </View>
      </Screen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View style={styles.errorContent}>
          <DetailLoadingSkeleton />
          <DetailStatePanel
            actionDisabled={query.isRefetching}
            actionLabel="Tentar novamente"
            description="Verifique sua conexão e tente novamente."
            onAction={() => void query.refetch()}
            title="Não foi possível carregar o aluno"
            tone="error"
          />
        </View>
      </Screen>
    );
  }

  const student = query.data;

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <DetailHeader title={student.name} />

        <View style={styles.identityCard} testID="trainer-student-detail-identity-card">
          <View accessibilityLabel={`Iniciais de ${student.name}`} style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text
              numberOfLines={1}
              style={styles.identityName}
              testID="trainer-student-detail-identity-name"
            >
              {student.name}
            </Text>
            <Text
              numberOfLines={1}
              style={styles.identityEmail}
              testID="trainer-student-detail-identity-contact"
            >
              {student.email ?? student.phone ?? 'Sem contato cadastrado'}
            </Text>
            <Text style={styles.identityGoal}>{student.goals ?? 'Sem objetivo cadastrado'}</Text>
          </View>
          <View
            accessible
            accessibilityLabel={`Status: ${studentStatusLabel(student.status)}`}
            style={styles.identityStatus}
          >
            <StudentStatusBadge status={student.status} />
          </View>
        </View>

        <View style={styles.factsCard}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.factsGrid}>
            {student.email || student.phone ? (
              <View style={styles.detailRowPair}>
                <DetailRow label="E-mail" value={student.email ?? 'Não informado'} />
                <DetailRow label="Telefone" value={student.phone ?? 'Não informado'} />
              </View>
            ) : null}
            <View style={styles.detailRowPair}>
              <DetailRow label="Nascimento" value={formatBirthDate(student.birthDate)} />
              <DetailRow label="Gênero" value={formatGender(student.gender)} />
            </View>
          </View>
          <DetailRow
            label="Restrições"
            value={student.restrictions ?? 'Sem restrições cadastradas'}
          />
        </View>

        <View style={styles.navigationCard}>
          <View style={styles.navigationHeading}>
            <Text style={styles.sectionTitle}>Avaliações</Text>
            <Text style={styles.navigationMeta}>Histórico e evolução</Text>
          </View>
          <Text style={styles.navigationDescription}>
            Consulte o histórico ou registre uma nova avaliação deste aluno.
          </Text>
          <View style={styles.actionRow}>
            <DetailAction
              label="Ver histórico"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/assessments',
                  params: { studentId },
                })
              }
              size="compact"
              variant="secondary"
            />
            <DetailAction
              label="Nova avaliação"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/assessments/new',
                  params: { studentId },
                })
              }
              size="compact"
            />
          </View>
        </View>

        <View style={styles.navigationCard}>
          <View style={styles.navigationHeading}>
            <Text style={styles.sectionTitle}>Treinos</Text>
            <Text style={styles.navigationMeta}>Planos do aluno</Text>
          </View>
          <Text style={styles.navigationDescription}>
            Consulte ou monte a prescrição de treino deste aluno.
          </Text>
          <View style={styles.actionRow}>
            <DetailAction
              label="Ver treinos"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/workouts',
                  params: { studentId },
                })
              }
              size="compact"
              variant="secondary"
            />
            <DetailAction
              label="Novo treino"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/workouts/new',
                  params: { studentId },
                })
              }
              size="compact"
            />
          </View>
        </View>

        {query.isRefetchError ? (
          <InlineMessage message="Não foi possível atualizar o aluno." tone="error" />
        ) : null}

        <DetailAction
          disabled={query.isRefetching}
          label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
          onPress={() => void query.refetch()}
          size="compact"
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

type DetailActionProps = {
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTestID?: string;
  label: string;
  onPress: () => void;
  size?: 'compact' | 'default';
  variant?: 'primary' | 'secondary';
};

function DetailAction({
  disabled = false,
  icon,
  iconTestID,
  label,
  onPress,
  size = 'default',
  variant = 'primary',
}: DetailActionProps) {
  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={size === 'compact' ? 8 : 2}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.detailAction,
        size === 'compact' ? styles.detailActionCompact : null,
        variant === 'secondary' ? styles.detailActionSecondary : null,
        disabled ? styles.disabledAction : null,
        pressed && !disabled ? styles.pressedAction : null,
      ]}
    >
      <Text style={styles.detailActionText}>{label}</Text>
      {icon ? (
        <Ionicons accessible={false} color={colors.ink} name={icon} size={18} testID={iconTestID} />
      ) : null}
    </Pressable>
  );
}

function DetailHeader({ title }: { title: string }) {
  return (
    <View style={styles.detailHeader}>
      <Pressable
        accessible
        accessibilityLabel="Voltar para alunos"
        accessibilityRole="button"
        onPress={returnToStudents}
        style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
      >
        <View style={styles.backSurface} testID="trainer-student-detail-back-surface">
          <Ionicons
            accessible={false}
            color={colors.ink}
            name="arrow-back"
            size={14}
            testID="trainer-student-detail-back-icon"
          />
        </View>
      </Pressable>
      <Text accessibilityRole="header" style={styles.detailTitle}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

type DetailStatePanelProps = {
  actionDisabled?: boolean;
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
  tone: 'loading' | 'error';
};

function DetailStatePanel({
  actionDisabled = false,
  actionLabel,
  description,
  onAction,
  title,
  tone,
}: DetailStatePanelProps) {
  return (
    <View style={styles.detailStatePanel} testID="trainer-student-detail-state-panel">
      <View
        style={[styles.detailStateIcon, tone === 'error' ? styles.errorStateIcon : null]}
        testID="trainer-student-detail-state-icon"
      >
        {tone === 'loading' ? (
          <View accessibilityLabel="Carregando" />
        ) : (
          <Ionicons color="#3498DB" name="cloud-offline-outline" size={24} />
        )}
      </View>
      <Text style={styles.detailStateTitle}>{title}</Text>
      <Text style={styles.detailStateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <DetailAction
          disabled={actionDisabled}
          icon="refresh-outline"
          iconTestID="trainer-student-detail-error-retry-icon"
          label={actionLabel}
          onPress={onAction}
          size="default"
        />
      ) : null}
    </View>
  );
}

function DetailLoadingSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonHeader} testID="trainer-student-detail-skeleton-header" />
      <View style={styles.skeletonProfile} testID="trainer-student-detail-skeleton-profile">
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonCopy}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonEmail} />
          <View style={styles.skeletonGoal} />
        </View>
      </View>
      <View style={styles.skeletonSummary} testID="trainer-student-detail-skeleton-summary-a" />
      <View style={styles.skeletonSummary} testID="trainer-student-detail-skeleton-summary-b" />
    </View>
  );
}

function formatBirthDate(value: string | null): string {
  if (!value) {
    return 'Não informado';
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatGender(value: TrainerStudent['gender']): string {
  if (value === 'male') {
    return 'Masculino';
  }

  if (value === 'female') {
    return 'Feminino';
  }

  if (value === 'other') {
    return 'Outro';
  }

  return 'Não informado';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'AL';
}

function returnToStudents(): void {
  router.replace('/trainer/students');
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 0,
    padding: 0,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  stateContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  errorContent: {
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 44,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backSurface: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  detailTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamilies.heading,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  headerSpacer: {
    width: 44,
  },
  centeredState: {
    justifyContent: 'center',
  },
  stateHeader: {
    gap: spacing.xs,
  },
  stateEyebrow: {
    color: colors.primaryText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 11,
    letterSpacing: 1,
  },
  stateHeaderTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 26,
    fontWeight: '700',
  },
  identityCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 89,
    padding: 14,
  },
  identityName: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  identityEmail: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
  },
  identityGoal: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
  },
  identityStatus: {
    transform: [{ scale: 0.55 }],
  },
  factsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  factsGrid: {
    gap: spacing.xs,
  },
  navigationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  navigationHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navigationMeta: {
    color: colors.primaryText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
  },
  navigationDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.avatar,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {
    color: colors.surface,
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 16,
  },
  detailRow: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  detailRowPair: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  label: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
  },
  detailValue: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
  },
  detailAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  detailActionCompact: {
    height: 32,
  },
  detailActionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
  },
  detailActionText: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 11,
    textAlign: 'center',
  },
  disabledAction: {
    opacity: 0.5,
  },
  pressedAction: {
    opacity: 0.8,
  },
  detailStatePanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.md,
    minHeight: 221,
    padding: spacing.xxl,
  },
  detailStateIcon: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: radii.avatar,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  errorStateIcon: {
    backgroundColor: '#EBF5FB',
  },
  detailStateTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailStateDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  skeletonContent: {
    gap: spacing.md,
  },
  skeletonHeader: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 24,
    width: 210,
  },
  skeletonProfile: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    height: 92,
    padding: 14,
  },
  skeletonAvatar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.avatar,
    height: 56,
    width: 56,
  },
  skeletonCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonName: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 14,
    width: 148,
  },
  skeletonEmail: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 12,
    width: 196,
  },
  skeletonGoal: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 12,
    width: 126,
  },
  skeletonSummary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.control,
    height: 78,
  },
});

function StudentDetailStateHeader() {
  return (
    <View style={styles.stateHeader}>
      <Text style={styles.stateEyebrow}>ALUNO</Text>
      <Text accessibilityRole="header" style={styles.stateHeaderTitle}>
        Aluno
      </Text>
    </View>
  );
}
