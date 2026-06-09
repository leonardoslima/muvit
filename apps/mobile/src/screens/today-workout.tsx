import type { workoutPlanFullSchema, workoutPlanSummarySchema } from '@muvit/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { z } from 'zod';
import type { ApiClient } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { createOfflineCache } from '../lib/offline-cache';
import { colors, sharedStyles } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type WorkoutPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type WorkoutExercise = WorkoutDay['exercises'][number];

type TodayWorkout = {
  plan: WorkoutPlan;
  day: WorkoutDay;
};

export function TodayWorkoutScreen() {
  const api = useApiClient();
  const userId = useAuth((state) => state.userId);
  const query = useQuery({
    enabled: Boolean(userId),
    queryKey: ['today-workout', userId],
    queryFn: async () => {
      if (!userId) throw new Error('usuario nao autenticado');
      const cache = createOfflineCache(AsyncStorage);
      return cache.get(`today-workout:${userId}`, async () => loadTodayWorkout(api, userId));
    },
  });

  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | undefined>();

  if (query.isLoading) {
    return (
      <View style={[sharedStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (query.isError || !query.data?.data) {
    return (
      <View style={[sharedStyles.screen, { justifyContent: 'center', gap: 12 }]}>
        <Text style={sharedStyles.title}>Sem treino ativo</Text>
        <Text style={sharedStyles.subtitle}>
          Quando seu professor publicar um treino ativo, ele aparece aqui.
        </Text>
      </View>
    );
  }

  const { plan, day } = query.data.data;

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }} style={sharedStyles.screen}>
      <View style={{ gap: 6 }}>
        <Text style={sharedStyles.title}>Treino de hoje</Text>
        <Text style={sharedStyles.subtitle}>
          {plan.name} - {day.label}
        </Text>
        {query.data.stale ? (
          <Text style={{ alignSelf: 'flex-start', color: colors.accent, fontWeight: '700' }}>
            offline
          </Text>
        ) : null}
      </View>

      {day.exercises.map((item: WorkoutExercise) => (
        <Pressable
          key={item.id}
          onPress={() => setSelectedExercise(item)}
          style={sharedStyles.card}
        >
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>
            {item.exercise.name}
          </Text>
          <Text style={sharedStyles.subtitle}>
            {item.sets} series - {item.reps} reps - {item.restSeconds ?? 0}s descanso
          </Text>
        </Pressable>
      ))}

      <Link href={`/log/${day.id}`} asChild>
        <Pressable style={sharedStyles.button}>
          <Text style={sharedStyles.buttonText}>Iniciar treino</Text>
        </Pressable>
      </Link>

      <ExerciseModal exercise={selectedExercise} onClose={() => setSelectedExercise(undefined)} />
    </ScrollView>
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
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' }}>
        <View
          style={[sharedStyles.card, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
        >
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '700' }}>
            {exercise?.exercise.name}
          </Text>
          <Text style={sharedStyles.subtitle}>Grupo: {exercise?.exercise.muscleGroup}</Text>
          <Text style={sharedStyles.subtitle}>
            {exercise?.sets} series de {exercise?.reps} reps
          </Text>
          <Text style={sharedStyles.subtitle}>Descanso: {exercise?.restSeconds ?? 0}s</Text>
          {exercise?.notes ? <Text style={sharedStyles.subtitle}>{exercise.notes}</Text> : null}
          <Pressable onPress={onClose} style={sharedStyles.button}>
            <Text style={sharedStyles.buttonText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

async function loadTodayWorkout(api: ApiClient, userId: string): Promise<TodayWorkout | null> {
  const summaries = await api.request<{ items: WorkoutPlanSummary[] }>(
    `/students/${userId}/workout-plans`,
  );
  const active = summaries.items.find((plan: WorkoutPlanSummary) => plan.status === 'active');
  if (!active) return null;

  const [plan, logs] = await Promise.all([
    api.request<WorkoutPlan>(`/workout-plans/${active.id}`),
    api.request<{ items: { workoutDayId: string; completed: boolean }[] }>(
      `/students/${userId}/workout-logs?limit=30`,
    ),
  ]);

  const completedDayIds = new Set(
    logs.items.filter((log) => log.completed).map((log) => log.workoutDayId),
  );
  const day =
    plan.days.find((candidate: WorkoutDay) => !completedDayIds.has(candidate.id)) ?? plan.days[0];

  return day ? { plan, day } : null;
}
