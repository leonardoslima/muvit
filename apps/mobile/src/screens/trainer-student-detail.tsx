import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getTrainerStudent } from '../application/trainer/trainer-data';
import { InlineMessage } from '../components/ui/inline-message';
import { ContextualHeader, HeaderAction, PageHeader, Screen } from '../components/ui/screen';
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
        <PageHeader eyebrow="ALUNO" testID="trainer-student-detail-state-header" title="Aluno" />
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
        <View style={styles.stateContent} testID="trainer-student-detail-state-content">
          <PageHeader eyebrow="ALUNO" testID="trainer-student-detail-state-header" title="Aluno" />
          <View accessibilityLabel="Carregando aluno" accessible>
            <DetailLoadingSkeleton />
          </View>
        </View>
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;

  if (isNotFound) {
    return (
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <PageHeader eyebrow="ALUNO" testID="trainer-student-detail-state-header" title="Aluno" />
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
          <PageHeader eyebrow="ALUNO" testID="trainer-student-detail-state-header" title="Aluno" />
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
        <DetailHeader
          onRefresh={() => void query.refetch()}
          refreshing={query.isRefetching}
          title={student.name}
        />

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
        </View>

        <View style={styles.summaryRow} testID="trainer-student-detail-summary-row">
          <SummaryCard
            icon="stats-chart-outline"
            label="Avaliações"
            support="Consulte os registros"
            testID="trainer-student-detail-assessment-summary"
            value="Histórico"
          />
          <SummaryCard
            icon="barbell-outline"
            label="Treinos"
            support="Planos do aluno"
            testID="trainer-student-detail-workout-summary"
            value="Planos"
          />
        </View>

        <View style={styles.previewGroup}>
          <PreviewCard
            actions={
              <View style={styles.actionRow}>
                <DetailLink
                  label="Ver histórico"
                  onPress={() =>
                    router.push({
                      pathname: '/trainer/students/[studentId]/assessments',
                      params: { studentId },
                    })
                  }
                />
                <DetailLink
                  label="Nova avaliação"
                  onPress={() =>
                    router.push({
                      pathname: '/trainer/students/[studentId]/assessments/new',
                      params: { studentId },
                    })
                  }
                />
              </View>
            }
            description="Consulte o histórico ou registre uma nova avaliação deste aluno."
            icon="stats-chart-outline"
            meta="Histórico e evolução"
            testID="trainer-student-detail-assessment-preview-card"
            title="Avaliações"
            titleTestID="trainer-student-detail-assessment-preview-title"
          />
          <PreviewCard
            actions={
              <View style={styles.actionRow}>
                <DetailLink
                  label="Ver treinos"
                  onPress={() =>
                    router.push({
                      pathname: '/trainer/students/[studentId]/workouts',
                      params: { studentId },
                    })
                  }
                />
                <DetailLink
                  label="Novo treino"
                  onPress={() =>
                    router.push({
                      pathname: '/trainer/students/[studentId]/workouts/new',
                      params: { studentId },
                    })
                  }
                />
              </View>
            }
            description="Consulte ou monte a prescrição de treino deste aluno."
            icon="barbell-outline"
            meta="Planos do aluno"
            testID="trainer-student-detail-workout-preview-card"
            title="Treinos"
            titleTestID="trainer-student-detail-workout-preview-title"
          />
        </View>

        {query.isRefetchError ? (
          <InlineMessage message="Não foi possível atualizar o aluno." tone="error" />
        ) : null}
      </View>
    </Screen>
  );
}

type SummaryCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  support: string;
  testID: string;
  value: string;
};

function SummaryCard({ icon, label, support, testID, value }: SummaryCardProps) {
  return (
    <View style={styles.summaryCard} testID={testID}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIcon}>
          <Ionicons accessible={false} color="#3498DB" name={icon} size={16} />
        </View>
        <Text numberOfLines={1} style={styles.summaryLabel}>
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.summarySupport}>
        {support}
      </Text>
    </View>
  );
}

type PreviewCardProps = {
  actions: React.ReactNode;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  meta: string;
  testID: string;
  title: string;
  titleTestID?: string;
};

function PreviewCard({
  actions,
  description,
  icon,
  meta,
  testID,
  title,
  titleTestID,
}: PreviewCardProps) {
  return (
    <View style={styles.previewCard} testID={testID}>
      <View style={styles.previewHeader}>
        <View style={styles.previewTitleGroup}>
          <View style={styles.previewIcon}>
            <Ionicons accessible={false} color="#3498DB" name={icon} size={18} />
          </View>
          <View style={styles.previewTitleCopy}>
            <Text style={styles.previewTitle} testID={titleTestID}>
              {title}
            </Text>
            <Text style={styles.previewMeta}>{meta}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.previewDescription}>{description}</Text>
      {actions}
    </View>
  );
}

type DetailLinkProps = {
  label: string;
  onPress: () => void;
};

function DetailLink({ label, onPress }: DetailLinkProps) {
  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.detailLink, pressed ? styles.pressedAction : null]}
    >
      <Text style={styles.detailLinkText}>{label}</Text>
      <Ionicons accessible={false} color={colors.primaryText} name="chevron-forward" size={16} />
    </Pressable>
  );
}

type DetailActionProps = {
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTestID?: string;
  label: string;
  onPress: () => void;
};

function DetailAction({ disabled = false, icon, iconTestID, label, onPress }: DetailActionProps) {
  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={2}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.detailAction,
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

type DetailHeaderProps = {
  onRefresh: () => void;
  refreshing: boolean;
  title: string;
};

function DetailHeader({ onRefresh, refreshing, title }: DetailHeaderProps) {
  return (
    <ContextualHeader
      action={
        <HeaderAction
          accessibilityLabel={refreshing ? 'Atualizando...' : 'Atualizar'}
          disabled={refreshing}
          onPress={onRefresh}
          testID="trainer-student-detail-header-action"
        >
          <Ionicons
            accessible={false}
            color={colors.primaryText}
            name="refresh-outline"
            size={18}
          />
        </HeaderAction>
      }
      backAccessibilityLabel="Voltar para alunos"
      backIcon={
        <Ionicons
          accessible={false}
          color={colors.ink}
          name="arrow-back"
          size={14}
          testID="trainer-student-detail-back-icon"
        />
      }
      backTestID="trainer-student-detail-header-back"
      onBack={returnToStudents}
      testID="trainer-student-detail-header"
      title={title}
    />
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
        />
      ) : null}
    </View>
  );
}

function DetailLoadingSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonProfile} testID="trainer-student-detail-skeleton-profile">
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonCopy}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonEmail} />
          <View style={styles.skeletonGoal} />
        </View>
      </View>
      <View style={styles.skeletonSummaryRow} testID="trainer-student-detail-skeleton-summary-row">
        <View style={styles.skeletonSummary} testID="trainer-student-detail-skeleton-summary-a" />
        <View style={styles.skeletonSummary} testID="trainer-student-detail-skeleton-summary-b" />
      </View>
      <View style={styles.skeletonPreview} />
      <View style={styles.skeletonPreview} />
    </View>
  );
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
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  errorContent: {
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  centeredState: {
    justifyContent: 'center',
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minHeight: 112,
    padding: spacing.md,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: radii.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  summaryLabel: {
    color: colors.muted,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 10,
  },
  summaryValue: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  summarySupport: {
    color: colors.primaryText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 10,
  },
  previewGroup: {
    gap: spacing.md,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  previewTitleCopy: {
    gap: 2,
  },
  previewTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  previewMeta: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  previewDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    alignItems: 'center',
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
  detailLink: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  detailLinkText: {
    color: colors.primaryText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
    textAlign: 'center',
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
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
  skeletonSummaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonSummary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.control,
    flex: 1,
    height: 112,
  },
  skeletonPreview: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.control,
    height: 148,
  },
});
