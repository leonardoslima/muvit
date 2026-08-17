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
  getWorkoutDraftProgress,
} from '../application/workouts/today-workout';
import {
  estimateWorkoutDuration,
  loadTodayWorkout,
  normalizeCachedTodayWorkout,
} from '../application/workouts/today-workout';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { authClient } from '../lib/auth-client';
import type { CacheResult } from '../lib/offline-cache';
import { createOfflineCache } from '../lib/offline-cache';
import { colors, sharedStyles, spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';
import { createWorkoutSessionStorage } from '../lib/workout-session-storage';

type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type WorkoutExercise = WorkoutDay['exercises'][number];
type TodayWorkoutQueryData = CacheResult<TodayWorkoutResult> & {
  draft: GuidedSession | null;
};

export function TodayWorkoutScreen() {
  const api = useApiClient();
  const authUserId = authClient.useSession().data?.user.id;
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | undefined>();

  const query = useQuery<TodayWorkoutQueryData>({
    enabled: Boolean(authUserId),
    queryKey: ['today-workout', authUserId],
    queryFn: async () => {
      if (!authUserId) {
        throw new Error('Sessão não autenticada.');
      }

      const cache = createOfflineCache(AsyncStorage);
      const cached = await cache.get<TodayWorkoutResult | null>(
        `today-workout:${authUserId}`,
        async () => loadTodayWorkout({ api }),
      );
      const data = cached.stale ? normalizeCachedTodayWorkout(cached.data) : cached.data;
      if (!data) throw new Error('Cache do treino inválido.');

      if (data.status !== 'available') {
        return { ...cached, data, draft: null };
      }

      const sessionStorage = createWorkoutSessionStorage(AsyncStorage);
      const draft = await sessionStorage.load(authUserId, data.day.id);
      return { ...cached, data, draft };
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

  const { data, draft, stale } = query.data;

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
  const actionLabel = draft ? 'Continuar treino' : 'Iniciar treino';
  const actionHref = draft ? `/session/${day.id}` : `/log/${day.id}`;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={draft ? 'RETOMAR' : 'HOJE'}
        subtitle={draft ? 'Seu progresso foi salvo' : `${plan.name} · ${day.label}`}
        title={draft ? 'Treino em andamento' : 'Seu treino de hoje'}
      />

      {stale ? <OfflineBadge /> : null}

      <Card>
        <Text style={sharedStyles.stateTitle}>{day.label}</Text>
        <Text style={sharedStyles.subtitle}>
          {day.exercises.length} exercícios · {estimateWorkoutDuration(day)} min estimados
        </Text>
      </Card>

      {draft ? <ResumeProgressCard day={day} session={draft} /> : null}

      <View style={styles.exerciseList}>
        <Text style={styles.sectionTitle}>Exercícios</Text>
        {day.exercises.map((exercise) => (
          <Pressable
            accessibilityRole="button"
            key={exercise.id}
            onPress={() => setSelectedExercise(exercise)}
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

      <ExerciseModal exercise={selectedExercise} onClose={() => setSelectedExercise(undefined)} />
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  exerciseTitle: {
    color: colors.ink,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 18,
  },
  offlineBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  offlineText: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  progressTrack: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden' as const,
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
  },
  modalBackdrop: {
    backgroundColor: '#00000040',
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalSurface: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.md,
    padding: spacing.xxl,
  },
  modalHandle: {
    alignSelf: 'center' as const,
    backgroundColor: colors.muted,
    borderRadius: 2,
    height: 4,
    width: 44,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 26,
  },
};
