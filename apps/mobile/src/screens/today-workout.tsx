import type { workoutPlanFullSchema } from '@muvit/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { z } from 'zod';
import { loadTodayWorkout } from '../application/workouts/today-workout';
import { authClient } from '../lib/auth-client';
import { createOfflineCache } from '../lib/offline-cache';
import { colors, sharedStyles } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type WorkoutExercise = WorkoutDay['exercises'][number];

export function TodayWorkoutScreen() {
  const api = useApiClient();
  const authUserId = authClient.useSession().data?.user.id;

  const query = useQuery({
    enabled: Boolean(authUserId),
    queryKey: ['today-workout', authUserId],
    queryFn: async () => {
      if (!authUserId) {
        throw new Error('Sessão não autenticada.');
      }

      const cache = createOfflineCache(AsyncStorage);
      return cache.get(`today-workout:${authUserId}`, async () => loadTodayWorkout({ api }));
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
