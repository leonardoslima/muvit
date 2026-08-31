import type { workoutPlanFullSchema } from '@muvit/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
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
import { StatePanel } from '../components/ui/state-panel';
import { authClient } from '../lib/auth-client';
import { isoDateFromTimestamp, todayIsoDate } from '../lib/date';
import { createWorkoutLogJournal } from '../lib/log-queue';
import type { CacheResult } from '../lib/offline-cache';
import { colors, controlSizes, radii, sharedStyles, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';
import { createWorkoutSessionStorage } from '../lib/workout-session-storage';

type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type WorkoutExercise = WorkoutDay['exercises'][number];
type SelectedExercise = {
  authUserId: string;
  dayId: string;
  exerciseId: string;
};
type TodayWorkoutQueryData = CacheResult<TodayWorkoutResult> & {
  completedLocal: boolean;
  draft: GuidedSession | null;
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
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos buscando seu treino de hoje."
          title="Carregando treino"
          tone="loading"
        />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar seu treino"
          tone="error"
        />
      </Screen>
    );
  }

  const { completedLocal, data, draft, stale } = query.data;

  if (data.status === 'no-active-plan') {
    return (
      <Screen style={styles.centeredState}>
        {stale ? <OfflineBadge /> : null}
        <StatePanel
          description="Seu professor ainda não publicou um plano de treino."
          title="Sem plano ativo"
          tone="empty"
        />
      </Screen>
    );
  }

  if (data.status === 'no-workout-today') {
    return (
      <Screen style={styles.centeredState}>
        {stale ? <OfflineBadge /> : null}
        <StatePanel
          description="Aproveite para descansar e se preparar para o próximo treino."
          title="Hoje é dia de recuperação"
          tone="empty"
        />
      </Screen>
    );
  }

  const { day, plan } = data;
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
        subtitle={
          completedLocal
            ? `${plan.name} · ${day.label}`
            : draft
              ? 'Seu progresso foi salvo'
              : `${plan.name} · ${day.label}`
        }
        title={
          completedLocal ? 'Treino concluído' : draft ? 'Treino em andamento' : 'Seu treino de hoje'
        }
      />

      {stale ? <OfflineBadge /> : null}

      <Card>
        <Text style={sharedStyles.stateTitle}>{day.label}</Text>
        <Text style={sharedStyles.subtitle}>
          {day.exercises.length} exercícios · {estimateWorkoutDuration(day)} min estimados
        </Text>
      </Card>

      {completedLocal ? (
        <Card>
          <Text style={sharedStyles.subtitle}>
            A conclusão deste treino está salva e será sincronizada quando necessário.
          </Text>
        </Card>
      ) : draft ? (
        <ResumeProgressCard day={day} session={draft} />
      ) : null}

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

      {completedLocal ? null : (
        <Link asChild href={actionHref}>
          <Pressable
            accessible
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            style={sharedStyles.button}
          >
            <Text style={sharedStyles.buttonText}>{actionLabel}</Text>
          </Pressable>
        </Link>
      )}

      <ExerciseModal
        exercise={selectedExercise}
        onClose={() => setSelectedExerciseSelection(undefined)}
      />
    </Screen>
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
    <View style={styles.offlineBadge}>
      <Text style={styles.offlineText}>offline</Text>
    </View>
  );
}

function ExerciseModal({
  exercise,
  onClose,
}: {
  exercise?: WorkoutExercise;
  onClose: () => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={Boolean(exercise)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSurface}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{exercise?.exercise.name}</Text>
          <Text style={sharedStyles.subtitle}>Grupo: {exercise?.exercise.muscleGroup}</Text>
          <Text style={sharedStyles.subtitle}>
            {exercise?.sets} séries de {exercise?.reps} repetições
          </Text>
          <Text style={sharedStyles.subtitle}>Descanso: {exercise?.restSeconds ?? 0} s</Text>
          {exercise?.notes ? <Text style={sharedStyles.subtitle}>{exercise.notes}</Text> : null}
          <AppButton label="Fechar" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  centeredState: {
    justifyContent: 'center' as const,
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
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
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
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
  modalBackdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalSurface: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    gap: spacing.md,
    padding: spacing.xxl,
  },
  modalHandle: {
    alignSelf: 'center' as const,
    backgroundColor: colors.muted,
    borderRadius: radii.handle,
    height: controlSizes.sheetHandleHeight,
    width: controlSizes.sheetHandleWidth,
  },
  modalTitle: {
    color: colors.ink,
    ...typography.sheetTitle,
  },
};
