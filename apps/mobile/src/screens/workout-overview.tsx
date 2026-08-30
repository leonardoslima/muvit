import type { workoutPlanFullSchema } from '@muvit/validators';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import type { z } from 'zod';
import { estimateWorkoutDuration, loadWorkoutDay } from '../application/workouts/today-workout';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { authClient } from '../lib/auth-client';
import { colors, sharedStyles, spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type WorkoutExercise = WorkoutDay['exercises'][number];
type SelectedExercise = {
  authUserId: string;
  dayId: string;
  exerciseId: string;
};

export function WorkoutOverviewScreen() {
  const api = useApiClient();
  const authUserId = authClient.useSession().data?.user.id;
  const params = useLocalSearchParams<{ dayId: string }>();
  const dayId = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const [selectedExerciseSelection, setSelectedExerciseSelection] = useState<SelectedExercise>();

  const query = useQuery({
    enabled: Boolean(authUserId && dayId),
    queryKey: ['workout-overview', authUserId, dayId],
    queryFn: async () => {
      if (!authUserId || !dayId) throw new Error('Treino não encontrado.');
      return loadWorkoutDay({ api, dayId });
    },
  });

  if (query.isLoading) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos buscando os exercícios do treino."
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
          title="Não foi possível carregar o treino"
          tone="error"
        />
      </Screen>
    );
  }

  const day = query.data;
  const muscleGroups = getMuscleGroups(day);
  const selectedExercise =
    selectedExerciseSelection &&
    selectedExerciseSelection.authUserId === authUserId &&
    selectedExerciseSelection.dayId === day.id
      ? day.exercises.find((exercise) => exercise.id === selectedExerciseSelection.exerciseId)
      : undefined;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton label="Voltar" onPress={() => router.back()} variant="secondary" />
      <ScreenHeader
        eyebrow="VISÃO GERAL"
        subtitle={`${day.exercises.length} exercícios · ~${estimateWorkoutDuration(day)} min`}
        title={day.label}
      />

      <Card>
        <Text style={styles.cardTitle}>Foco do treino</Text>
        <Text style={sharedStyles.subtitle}>{muscleGroups || 'Treino completo'}</Text>
      </Card>

      <View style={styles.exerciseList}>
        <Text style={styles.sectionTitle}>Exercícios</Text>
        {day.exercises.map((exercise) => (
          <Pressable
            accessibilityLabel={exercise.exercise.name}
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
            style={styles.exerciseCard}
          >
            <View style={styles.exerciseText}>
              <Text style={styles.exerciseTitle}>{exercise.exercise.name}</Text>
              <Text style={sharedStyles.subtitle}>
                {exercise.sets} séries · {exercise.reps} repetições
              </Text>
            </View>
            <Text style={styles.exerciseHint}>Ver detalhes</Text>
          </Pressable>
        ))}
      </View>

      <AppButton label="Iniciar treino" onPress={() => router.push(`/session/${day.id}`)} />

      <ExerciseModal
        exercise={selectedExercise}
        onClose={() => setSelectedExerciseSelection(undefined)}
      />
    </Screen>
  );
}

function getMuscleGroups(day: WorkoutDay): string {
  return Array.from(
    new Set(day.exercises.map((exercise) => exercise.exercise.muscleGroup).filter(Boolean)),
  ).join(' · ');
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
          <Text style={sharedStyles.subtitle}>
            Grupo muscular: {exercise?.exercise.muscleGroup}
          </Text>
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
  cardTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  exerciseList: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  exerciseCard: {
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: spacing.md,
    borderWidth: 1,
    flexDirection: 'row' as const,
    gap: spacing.md,
    justifyContent: 'space-between' as const,
    padding: spacing.lg,
  },
  exerciseText: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseTitle: {
    color: colors.ink,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 18,
  },
  exerciseHint: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
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
