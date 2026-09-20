import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  TRAINER_STUDENTS_PAGE_SIZE,
  type TrainerStudent,
  getTrainerSummary,
  listTrainerStudents,
} from '../application/trainer/trainer-data';
import { studentStatusLabel } from '../components/trainer/student-status-badge';
import { TrainerMetricCard } from '../components/trainer/trainer-metric-card';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { authClient } from '../lib/auth-client';
import { colors, fontFamilies, radii, spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerHomeScreen() {
  const api = useApiClient();
  const session = authClient.useSession();
  const query = useQuery({
    queryKey: ['trainer', 'summary'],
    queryFn: ({ signal }) => getTrainerSummary(api, signal),
  });
  const recentStudentsQuery = useQuery({
    queryKey: ['trainer', 'students', 'recent'],
    queryFn: async ({ signal }) => {
      const page = await listTrainerStudents(api, {
        limit: TRAINER_STUDENTS_PAGE_SIZE,
        offset: 0,
        signal,
      });

      return page ?? { items: [], total: 0 };
    },
    enabled: Boolean(query.data?.students.total),
  });
  const firstName = getFirstName(session.data?.user.name);
  const greetingTitle = firstName ? `Bom dia, ${firstName}` : 'Bom dia';

  if (query.isPending) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="INÍCIO"
          subtitle="Acompanhe seus alunos de onde estiver."
          testID="trainer-home-header"
          title={greetingTitle}
        />
        <TrainerHomeLoadingState />
      </Screen>
    );
  }

  if (!query.data) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="INÍCIO"
          subtitle="Acompanhe seus alunos de onde estiver."
          testID="trainer-home-header"
          title={greetingTitle}
        />
        <TrainerHomeErrorState
          actionDisabled={query.isRefetching}
          onAction={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const summary = query.data;
  const recentStudents = recentStudentsQuery.data?.items.slice(0, 3) ?? [];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="INÍCIO"
        subtitle="Acompanhe seus alunos de onde estiver."
        testID="trainer-home-header"
        title={greetingTitle}
      />

      {summary.students.total === 0 ? (
        <>
          <TrainerHomeEmptyState />
          <Link asChild href="/trainer/students">
            <AppButton label="Ver todos os alunos" onPress={() => undefined} />
          </Link>
        </>
      ) : (
        <View style={styles.dashboard} testID="trainer-home-dashboard">
          <View style={styles.metrics}>
            <TrainerMetricCard
              description="com vínculo ativo"
              icon="users"
              label="Alunos ativos"
              testID="trainer-metric-students"
              value={summary.students.active}
            />
            <TrainerMetricCard
              description="nos últimos 30 dias"
              icon="clipboard"
              iconBackgroundColor="#EBF5FB"
              iconColor="#3498DB"
              label="Avaliações recentes"
              testID="trainer-metric-assessments"
              value={summary.assessments.last30d}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alunos para acompanhar</Text>
            <Link asChild href="/trainer/students">
              <Pressable
                accessible
                accessibilityLabel="Ver todos os alunos"
                accessibilityRole="button"
                hitSlop={12}
                style={styles.sectionLink}
              >
                <Text style={styles.sectionLinkText}>Ver todos os alunos</Text>
                <Feather color={colors.primary} name="arrow-right" size={16} />
              </Pressable>
            </Link>
          </View>

          <View style={styles.recentStudents} testID="trainer-recent-students">
            {recentStudents.map((student) => (
              <RecentStudentRow key={student.id} student={student} />
            ))}
          </View>
        </View>
      )}

      {query.isRefetchError ? (
        <InlineMessage message="Não foi possível atualizar a visão geral." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isRefetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />
    </Screen>
  );
}

function TrainerHomeLoadingState() {
  return (
    <Card style={[styles.stateCard, styles.loadingStateCard]} testID="trainer-home-loading-state">
      <View
        accessibilityLabel="Carregando"
        accessibilityRole="progressbar"
        accessible
        style={styles.loadingAccessibility}
      />
      <Text style={styles.stateTitle}>Carregando visão geral</Text>
      <View testID="trainer-home-loading-greeting" style={styles.skeletonGreeting} />
      <View testID="trainer-home-loading-subtitle" style={styles.skeletonSubtitle} />
      <View style={styles.skeletonMetrics}>
        <View style={styles.skeletonMetric} testID="trainer-home-loading-metric">
          <View style={[styles.skeletonMetricIcon, styles.skeletonMetricIconPrimary]} />
          <View style={styles.skeletonMetricCopy}>
            <View style={styles.skeletonMetricLabel} />
            <View style={styles.skeletonMetricValue} />
          </View>
        </View>
        <View style={styles.skeletonMetric} testID="trainer-home-loading-metric">
          <View style={[styles.skeletonMetricIcon, styles.skeletonMetricIconSecondary]} />
          <View style={styles.skeletonMetricCopy}>
            <View style={styles.skeletonMetricLabel} />
            <View style={styles.skeletonMetricValue} />
          </View>
        </View>
      </View>
    </Card>
  );
}

function TrainerHomeEmptyState() {
  return (
    <Card style={[styles.stateCard, styles.centeredStateCard]} testID="trainer-home-empty-state">
      <View style={styles.stateIcon} testID="trainer-home-empty-icon">
        <Feather color={colors.muted} name="user-x" size={17} />
      </View>
      <Text style={[styles.stateTitle, styles.centeredStateTitle]}>Nenhum aluno vinculado</Text>
      <Text style={styles.stateDescription}>
        Nenhum aluno vinculado para acompanhar no momento.
      </Text>
    </Card>
  );
}

type TrainerHomeErrorStateProps = {
  actionDisabled: boolean;
  onAction: () => void;
};

function TrainerHomeErrorState({ actionDisabled, onAction }: TrainerHomeErrorStateProps) {
  return (
    <Card style={[styles.stateCard, styles.centeredStateCard]} testID="trainer-home-error-state">
      <View style={[styles.stateIcon, styles.errorStateIcon]} testID="trainer-home-error-icon">
        <Feather color={colors.dangerText} name="alert-triangle" size={17} />
      </View>
      <Text style={[styles.stateTitle, styles.centeredStateTitle]}>
        Não foi possível carregar a visão geral
      </Text>
      <Text style={styles.stateDescription}>Verifique sua conexão e tente novamente.</Text>
      <View style={styles.stateAction}>
        <AppButton
          disabled={actionDisabled}
          label="Tentar novamente"
          onPress={onAction}
          trailingIcon={<Feather color={colors.ink} name="refresh-cw" size={16} />}
        />
      </View>
    </Card>
  );
}

function getFirstName(name: string | null | undefined): string | undefined {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName || undefined;
}

function RecentStudentRow({ student }: { student: TrainerStudent }) {
  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir ${student.name}`}
      accessibilityRole="button"
      onPress={() => router.push(`/trainer/students/${student.id}`)}
      style={({ pressed }) => [styles.studentRow, pressed ? styles.pressed : null]}
      testID="trainer-student-row"
    >
      <View style={styles.studentAvatar} testID="trainer-student-avatar">
        <Text style={styles.studentAvatarText}>{getInitials(student.name)}</Text>
      </View>
      <View style={styles.studentCopy}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentStatus}>{studentStatusLabel(student.status)}</Text>
      </View>
      <Feather color={colors.muted} name="chevron-right" size={18} />
    </Pressable>
  );
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'AL';
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  stateCard: {
    alignSelf: 'stretch',
    borderRadius: radii.control,
    gap: 9,
    padding: 14,
  },
  loadingStateCard: {
    minHeight: 160,
  },
  centeredStateCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  errorStateIcon: {
    backgroundColor: colors.dangerSoft,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  centeredStateTitle: {
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    width: '100%',
  },
  stateAction: {
    marginTop: spacing.xs,
    width: '100%',
  },
  loadingAccessibility: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
  skeletonGreeting: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    height: 20,
    width: 168,
  },
  skeletonSubtitle: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    height: 10,
    width: 236,
  },
  skeletonMetrics: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  skeletonMetric: {
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.sm,
    flex: 1,
    height: 56,
    padding: 10,
  },
  skeletonMetricIcon: {
    borderRadius: radii.pill,
    height: 28,
    width: 28,
  },
  skeletonMetricIconPrimary: {
    backgroundColor: colors.primarySoft,
  },
  skeletonMetricIconSecondary: {
    backgroundColor: '#EBF5FB',
  },
  skeletonMetricCopy: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  skeletonMetricLabel: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    height: 8,
    width: 72,
  },
  skeletonMetricValue: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    height: 12,
    width: 28,
  },
  dashboard: {
    gap: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 22,
  },
  sectionLinkText: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
  },
  recentStudents: {
    gap: 10,
  },
  studentRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  studentAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.avatar,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  studentAvatarText: {
    color: colors.surface,
    fontFamily: fontFamilies.heading,
    fontSize: 14,
  },
  studentCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  studentName: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  studentStatus: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.8,
  },
});
