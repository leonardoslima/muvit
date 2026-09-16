import { Ionicons } from '@expo/vector-icons';
import type { workoutPlanFullSchema } from '@muvit/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, type PressableProps, Text, View } from 'react-native';
import type { z } from 'zod';
import type { GuidedSession } from '../application/workouts/guided-session';
import {
  type TodayWorkoutResult,
  estimateWorkoutDuration,
  getWorkoutDraftProgress,
  loadTodayWorkoutWithOfflineFallback,
} from '../application/workouts/today-workout';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { ExerciseDetailsModal } from '../components/workouts/exercise-details-modal';
import { authClient } from '../lib/auth-client';
import { formatTodayDisplayLabel, isoDateFromTimestamp, todayIsoDate } from '../lib/date';
import { createWorkoutLogJournal } from '../lib/log-queue';
import { muscleGroupLabel } from '../lib/muscle-groups';
import type { CacheResult } from '../lib/offline-cache';
import { colors, controlSizes, radii, sharedStyles, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';
import { createWorkoutSessionStorage } from '../lib/workout-session-storage';

type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type SelectedExercise = {
  authUserId: string;
  dayId: string;
  exerciseId: string;
};
type TodayWorkoutQueryData = CacheResult<TodayWorkoutResult> & {
  completedLocal: boolean;
  draft: GuidedSession | null;
};
type TodayStateLayoutProps = {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  stale?: boolean;
  title: string;
  tone: 'loading' | 'empty' | 'error';
};

export function TodayWorkoutScreen() {
  const api = useApiClient();
  const authUserId = authClient.useSession().data?.user.id;
  const [selectedExerciseSelection, setSelectedExerciseSelection] = useState<SelectedExercise>();

  const query = useQuery<TodayWorkoutQueryData>({
    enabled: Boolean(authUserId),
    queryKey: ['today-workout', authUserId],
    queryFn: async ({ signal }) => {
      if (!authUserId) {
        throw new Error('Sessão não autenticada.');
      }

      const cached = await loadTodayWorkoutWithOfflineFallback({
        api,
        authUserId,
        storage: AsyncStorage,
      });
      const { data } = cached;

      if (data.status !== 'available') {
        return { ...cached, completedLocal: false, data, draft: null };
      }

      const sessionStorage = createWorkoutSessionStorage(AsyncStorage);
      let stored = await sessionStorage.load(authUserId, data.day.id);
      const journal = createWorkoutLogJournal(AsyncStorage);
      const currentDate = todayIsoDate();
      let operationDate = stored ? isoDateFromTimestamp(stored.session.startedAtMs) : currentDate;
      let hasJournalCompletion = await journal.hasForDay(authUserId, operationDate, data.day.id);
      if (stored?.kind === 'active' && hasJournalCompletion && operationDate < currentDate) {
        try {
          if (signal.aborted) throw new Error('Consulta do treino cancelada.');
          const removed = await sessionStorage.removeIfUnchanged(
            authUserId,
            data.day.id,
            stored.session.startedAtMs,
          );
          if (signal.aborted) throw new Error('Consulta do treino cancelada.');
          if (removed) {
            await journal.removeTerminal(authUserId, operationDate, data.day.id);
            if (signal.aborted) throw new Error('Consulta do treino cancelada.');
            stored = null;
            hasJournalCompletion = false;
          } else {
            stored = await sessionStorage.load(authUserId, data.day.id);
            operationDate = stored ? isoDateFromTimestamp(stored.session.startedAtMs) : currentDate;
            hasJournalCompletion = await journal.hasForDay(authUserId, operationDate, data.day.id);
          }
        } catch (error) {
          if (signal.aborted) throw error;
          // O terminal antigo continua protegendo o ciclo encerrado e a próxima montagem tenta limpar.
          stored = null;
          hasJournalCompletion = false;
        }
      }
      const completedLocal = hasJournalCompletion || stored?.session.phase === 'summary';
      if (completedLocal) return { ...cached, completedLocal, data, draft: null };

      return { ...cached, completedLocal: false, data, draft: stored?.session ?? null };
    },
  });

  if (query.isLoading) {
    return (
      <TodayStateLayout
        description="Estamos buscando seu treino de hoje."
        title="Carregando treino"
        tone="loading"
      />
    );
  }

  if (query.isError || !query.data) {
    return (
      <TodayStateLayout
        actionLabel="Tentar novamente"
        description="Verifique sua conexão e tente novamente."
        onAction={() => void query.refetch()}
        title="Não foi possível carregar o treino"
        tone="error"
      />
    );
  }

  const { completedLocal, data, draft, stale } = query.data;

  if (data.status === 'no-active-plan') {
    return (
      <TodayStateLayout
        description="Seu professor ainda não publicou um plano de treino."
        stale={stale}
        title="Sem plano ativo"
        tone="empty"
      />
    );
  }

  if (data.status === 'no-workout-today') {
    return (
      <TodayStateLayout
        description="Aproveite para descansar e se preparar para o próximo treino."
        stale={stale}
        title="Hoje é dia de recuperação"
        tone="empty"
      />
    );
  }

  const { day } = data;
  const selectedExercise =
    selectedExerciseSelection &&
    selectedExerciseSelection.authUserId === authUserId &&
    selectedExerciseSelection.dayId === day.id
      ? day.exercises.find((exercise) => exercise.id === selectedExerciseSelection.exerciseId)
      : undefined;
  const actionLabel = draft ? 'Continuar treino' : 'Iniciar treino';
  const actionHref = draft ? `/session/${day.id}` : `/log/${day.id}`;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={completedLocal ? 'CONCLUÍDO' : draft ? 'RETOMAR' : 'HOJE'}
        subtitle={formatTodayDisplayLabel()}
        title={
          completedLocal ? 'Treino concluído' : draft ? 'Treino em andamento' : 'Seu treino de hoje'
        }
      />

      {stale ? <OfflineBadge /> : null}

      {draft || completedLocal ? (
        <Card>
          <Text style={sharedStyles.stateTitle}>{day.label}</Text>
          <Text style={sharedStyles.subtitle}>
            {day.exercises.length} exercícios · {estimateWorkoutDuration(day)} min estimados
          </Text>
        </Card>
      ) : (
        <TodayWorkoutCard actionHref={`/log/${day.id}`} day={day} />
      )}

      {completedLocal ? (
        <Card>
          <Text style={sharedStyles.subtitle}>
            A conclusão deste treino está salva e será sincronizada quando necessário.
          </Text>
        </Card>
      ) : draft ? (
        <ResumeProgressCard day={day} session={draft} />
      ) : null}

      {!draft && !completedLocal ? (
        <Text style={styles.helperText}>Tudo pronto para você começar com calma.</Text>
      ) : null}

      {draft || completedLocal ? (
        <View style={styles.exerciseList}>
          <Text style={styles.sectionTitle}>Exercícios</Text>
          {day.exercises.map((exercise) => (
            <Pressable
              accessibilityRole="button"
              key={exercise.id}
              onPress={() => {
                if (!authUserId) return;
                setSelectedExerciseSelection({
                  authUserId,
                  dayId: day.id,
                  exerciseId: exercise.id,
                });
              }}
              style={sharedStyles.card}
            >
              <Text style={styles.exerciseTitle}>{exercise.exercise.name}</Text>
              <Text style={sharedStyles.subtitle}>
                {exercise.sets} séries · {exercise.reps} repetições · descanso{' '}
                {exercise.restSeconds ?? 0} s
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {completedLocal || !draft ? null : (
        <Link asChild href={actionHref}>
          <AppButton label={actionLabel} onPress={() => undefined} />
        </Link>
      )}

      <ExerciseDetailsModal
        exercise={selectedExercise}
        onClose={() => setSelectedExerciseSelection(undefined)}
      />
    </Screen>
  );
}

function TodayStateLayout({
  actionLabel,
  description,
  onAction,
  stale,
  title,
  tone,
}: TodayStateLayoutProps) {
  if (tone === 'loading') {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <TodayLoadingState />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.stateContent}>
      {tone === 'empty' ? (
        <TodayEmptyHeader />
      ) : (
        <ScreenHeader eyebrow="HOJE" subtitle="Hipertrofia A · Terça" title="Treino de hoje" />
      )}
      {stale ? <OfflineBadge /> : null}
      <View style={styles.statePanelContainer}>
        <TodayStatePanel
          actionLabel={actionLabel}
          description={description}
          onAction={onAction}
          title={title}
          tone={tone}
        />
      </View>
    </Screen>
  );
}

function TodayEmptyHeader() {
  return (
    <View style={styles.emptyHeader}>
      <View style={styles.emptyHeaderTopRow}>
        <Text style={sharedStyles.eyebrow}>SEM PLANO</Text>
        <Pressable
          accessibilityLabel="Notificações"
          accessibilityRole="button"
          style={styles.emptyHeaderNotification}
        >
          <Ionicons color={colors.ink} name="notifications-outline" size={22} />
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={sharedStyles.title}>
        Seu treino de hoje
      </Text>
      <Text style={sharedStyles.subtitle}>{formatTodayDisplayLabel()}</Text>
    </View>
  );
}

function TodayWorkoutCard({ actionHref, day }: { actionHref: string; day: WorkoutDay }) {
  const muscleGroups = Array.from(
    new Set(day.exercises.map((exercise) => muscleGroupLabel(exercise.exercise.muscleGroup))),
  );

  return (
    <Card testID="today-workout-card" style={styles.todayWorkoutCard}>
      <View style={styles.todayBadge}>
        <Text style={styles.todayBadgeText}>HOJE</Text>
      </View>
      <Text style={styles.todayWorkoutTitle}>{day.label}</Text>
      {muscleGroups.length > 0 ? (
        <Text style={styles.todayWorkoutGroups}>{muscleGroups.join(' · ')}</Text>
      ) : null}
      <Text style={styles.todayWorkoutMeta}>
        {day.exercises.length} exercícios · ~{estimateWorkoutDuration(day)} min
      </Text>
      <View style={styles.todayWorkoutSpacer} />
      <Link asChild href={actionHref}>
        <TodayWorkoutActionPressable label="Iniciar treino" />
      </Link>
    </Card>
  );
}

function TodayWorkoutActionPressable({
  label,
  onPress,
}: {
  label: string;
  onPress?: PressableProps['onPress'];
}) {
  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.todayWorkoutAction, pressed ? styles.pressed : null]}
    >
      <Text style={styles.todayWorkoutActionText}>{label}</Text>
    </Pressable>
  );
}

function TodayLoadingState() {
  return (
    <View
      accessibilityLabel="Carregando treino"
      accessibilityRole="progressbar"
      style={styles.loadingState}
    >
      <View style={styles.loadingHeader}>
        <View style={[styles.skeleton, styles.skeletonEyebrow]} />
        <View style={[styles.skeleton, styles.skeletonTitle]} />
        <View style={[styles.skeleton, styles.skeletonSubtitle]} />
      </View>
      <View style={styles.loadingExercises}>
        {[1, 2, 3].map((number) => (
          <View key={number} testID={`today-loading-exercise-${number}`} style={styles.loadingCard}>
            <View style={styles.loadingCardHeader}>
              <View style={[styles.skeleton, styles.skeletonCircle]} />
              <View style={[styles.skeleton, styles.skeletonExerciseTitle]} />
            </View>
            <View style={[styles.skeleton, styles.skeletonSummary]} />
            <View style={[styles.skeleton, styles.skeletonRest]} />
          </View>
        ))}
      </View>
    </View>
  );
}

function TodayStatePanel({
  actionLabel,
  description,
  onAction,
  title,
  tone,
}: Omit<TodayStateLayoutProps, 'stale'>) {
  const isError = tone === 'error';

  return (
    <Card style={styles.todayStatePanel} testID="today-state-panel">
      <View
        style={[styles.todayStateIcon, isError ? styles.todayStateIconError : null]}
        testID="today-state-icon"
      >
        <Ionicons
          color={isError ? colors.dangerText : colors.primaryText}
          name={tone === 'empty' ? 'clipboard-outline' : 'warning-outline'}
          size={24}
        />
      </View>
      <Text style={styles.todayStateTitle}>{title}</Text>
      <Text style={styles.todayStateDescription}>{description}</Text>
      {!isError ? (
        <>
          <View style={styles.todayStateDivider} />
          <Text style={styles.todayStateHint}>
            Quando houver um plano ativo, ele aparecerá aqui.
          </Text>
        </>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.todayStateAction} testID="today-state-action">
          <View style={styles.todayStateActionButton}>
            <AppButton label={actionLabel} onPress={onAction} />
            <View pointerEvents="none" style={styles.todayStateActionIcon}>
              <Ionicons color={colors.ink} name="arrow-forward-outline" size={18} />
            </View>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function ResumeProgressCard({ day, session }: { day: WorkoutDay; session: GuidedSession }) {
  const progress = getWorkoutDraftProgress(day, session);

  return (
    <Card>
      <Text style={sharedStyles.stateTitle}>
        {progress.completedExerciseCount} de {progress.totalExerciseCount} exercícios concluídos
      </Text>
      <View testID="workout-progress" style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress.progressPercent}%` }]} />
      </View>
      <Text style={sharedStyles.subtitle}>
        {progress.next
          ? `Próximo: ${progress.next.exerciseName} · Série ${progress.next.setNumber} de ${progress.next.totalSets}`
          : 'Treino pronto para concluir'}
      </Text>
    </Card>
  );
}

function OfflineBadge() {
  return (
    <View accessibilityLabel="Disponível offline" style={styles.offlineBadge}>
      <Ionicons color={colors.primaryText} name="cloud-download-outline" size={14} />
      <Text style={styles.offlineText}>Disponível offline</Text>
    </View>
  );
}

const styles = {
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  stateContent: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  statePanelContainer: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    width: '100%' as const,
  },
  emptyHeader: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyHeaderTopRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  emptyHeaderNotification: {
    alignItems: 'center' as const,
    height: controlSizes.touchTarget,
    justifyContent: 'center' as const,
    width: controlSizes.touchTarget,
  },
  todayWorkoutCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    borderWidth: 0,
    gap: spacing.sm,
    minHeight: 238,
    padding: spacing.xl,
  },
  todayBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  todayBadgeText: {
    color: colors.primaryText,
    ...typography.labelCompact,
    fontSize: typography.caption.fontSize,
  },
  todayWorkoutTitle: {
    color: colors.ink,
    ...typography.sessionTitle,
  },
  todayWorkoutGroups: {
    color: colors.ink,
    ...typography.body,
  },
  todayWorkoutMeta: {
    color: colors.ink,
    ...typography.caption,
  },
  todayWorkoutSpacer: {
    flex: 1,
    minHeight: spacing.sm,
  },
  todayWorkoutAction: {
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    height: controlSizes.button,
    justifyContent: 'center' as const,
    minHeight: controlSizes.button,
    width: '100%' as const,
  },
  todayWorkoutActionText: {
    color: colors.primaryText,
    ...typography.bodyStrong,
  },
  pressed: {
    opacity: 0.8,
  },
  helperText: {
    color: colors.muted,
    ...typography.caption,
  },
  loadingState: {
    flexGrow: 1,
    gap: spacing.md,
  },
  loadingHeader: {
    gap: spacing.sm,
    height: 78,
  },
  loadingExercises: {
    flexGrow: 1,
    gap: spacing.md,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    minHeight: 118,
    padding: spacing.lg,
  },
  loadingCardHeader: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  skeleton: {
    backgroundColor: colors.line,
    borderRadius: radii.sm,
    opacity: 0.7,
  },
  skeletonEyebrow: {
    height: 9,
    width: 54,
  },
  skeletonTitle: {
    borderRadius: radii.control,
    height: 22,
    width: 184,
  },
  skeletonSubtitle: {
    borderRadius: radii.sm,
    height: 11,
    width: 132,
  },
  skeletonCircle: {
    borderRadius: radii.avatar,
    height: 36,
    width: 36,
  },
  skeletonExerciseTitle: {
    height: 14,
    width: 150,
  },
  skeletonSummary: {
    height: 10,
    width: 196,
  },
  skeletonRest: {
    height: 10,
    width: 112,
  },
  todayStatePanel: {
    alignItems: 'center' as const,
    borderRadius: radii.md,
    gap: spacing.md,
    padding: spacing.xxl,
    width: '100%' as const,
  },
  todayStateIcon: {
    alignItems: 'center' as const,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: controlSizes.touchTarget,
    justifyContent: 'center' as const,
    width: controlSizes.touchTarget,
  },
  todayStateIconError: {
    backgroundColor: colors.dangerSoft,
  },
  todayStateTitle: {
    color: colors.ink,
    ...typography.title,
    textAlign: 'center' as const,
  },
  todayStateDescription: {
    color: colors.muted,
    ...typography.subtitle,
    textAlign: 'center' as const,
  },
  todayStateDivider: {
    backgroundColor: colors.line,
    height: 1,
    width: '100%' as const,
  },
  todayStateHint: {
    color: colors.ink,
    ...typography.bodyStrong,
    textAlign: 'center' as const,
  },
  todayStateAction: {
    width: '100%' as const,
  },
  todayStateActionButton: {
    position: 'relative' as const,
  },
  todayStateActionIcon: {
    position: 'absolute' as const,
    right: spacing.xl,
    top: (controlSizes.button - 18) / 2,
  },
  exerciseList: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  exerciseTitle: {
    color: colors.ink,
    ...typography.exerciseTitle,
  },
  offlineBadge: {
    alignSelf: 'flex-start' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: 'row' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  offlineText: {
    color: colors.primaryText,
    ...typography.bodyStrong,
    fontSize: typography.caption.fontSize,
  },
  progressTrack: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    height: controlSizes.progressTrack,
    overflow: 'hidden' as const,
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: controlSizes.progressTrack,
  },
};
