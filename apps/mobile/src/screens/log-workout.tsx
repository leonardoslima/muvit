import type {
  finishWorkoutLogSchema,
  workoutPlanFullSchema,
  workoutPlanSummarySchema,
} from '@muvit/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { z } from 'zod';
import { useAuth } from '../lib/auth-store';
import { todayIsoDate } from '../lib/date';
import { createLogQueue, sendPendingWorkoutLog } from '../lib/log-queue';
import { colors, sharedStyles } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type WorkoutPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type WorkoutExercise = WorkoutDay['exercises'][number];
type FinishWorkoutLogInput = z.infer<typeof finishWorkoutLogSchema>;

type SetState = {
  workoutExerciseId: string;
  setNumber: number;
  repsDone: string;
  loadKg: string;
  completed: boolean;
};

export function LogWorkoutScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const api = useApiClient();
  const userId = useAuth((state) => state.userId);
  const [sets, setSets] = useState<SetState[]>([]);
  const [saving, setSaving] = useState(false);
  const query = useQuery({
    enabled: Boolean(userId && params.dayId),
    queryKey: ['log-workout', userId, params.dayId],
    queryFn: async () => {
      if (!userId || !params.dayId) throw new Error('treino nao encontrado');
      const day = await loadWorkoutDay(api, userId, params.dayId);
      setSets((current) => (current.length > 0 ? current : buildInitialSets(day.exercises)));
      return day;
    },
  });

  const groupedSets = useMemo(() => {
    const groups = new Map<string, SetState[]>();
    for (const set of sets) {
      groups.set(set.workoutExerciseId, [...(groups.get(set.workoutExerciseId) ?? []), set]);
    }
    return groups;
  }, [sets]);

  function updateSet(next: SetState) {
    setSets((current) =>
      current.map((item) =>
        item.workoutExerciseId === next.workoutExerciseId && item.setNumber === next.setNumber
          ? next
          : item,
      ),
    );
  }

  async function finish() {
    if (!params.dayId) return;
    setSaving(true);
    const finishBody: FinishWorkoutLogInput = {
      durationMin: 45,
      completed: true,
      sets: sets.map((set) => ({
        workoutExerciseId: set.workoutExerciseId,
        setNumber: set.setNumber,
        repsDone: toOptionalNumber(set.repsDone),
        loadKg: toOptionalNumber(set.loadKg),
        completed: set.completed,
      })),
    };

    try {
      await sendPendingWorkoutLog(api, {
        workoutDayId: params.dayId,
        date: todayIsoDate(),
        finish: finishBody,
      });
      router.back();
    } catch {
      const queue = createLogQueue(AsyncStorage);
      await queue.enqueue({ workoutDayId: params.dayId, date: todayIsoDate(), finish: finishBody });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  if (query.isLoading) {
    return (
      <View style={[sharedStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={[sharedStyles.screen, { justifyContent: 'center', gap: 12 }]}>
        <Text style={sharedStyles.title}>Treino indisponivel</Text>
        <Text style={sharedStyles.subtitle}>Nao foi possivel abrir este treino agora.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }} style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>{query.data.label}</Text>
      {query.data.exercises.map((exercise: WorkoutExercise) => (
        <View key={exercise.id} style={sharedStyles.card}>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>
            {exercise.exercise.name}
          </Text>
          {(groupedSets.get(exercise.id) ?? []).map((set) => (
            <View
              key={`${set.workoutExerciseId}-${set.setNumber}`}
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              <Pressable
                onPress={() => updateSet({ ...set, completed: !set.completed })}
                style={[
                  sharedStyles.secondaryButton,
                  {
                    minHeight: 44,
                    width: 44,
                    backgroundColor: set.completed ? colors.primary : colors.surface,
                  },
                ]}
              >
                <Text style={{ color: set.completed ? '#ffffff' : colors.ink, fontWeight: '700' }}>
                  {set.setNumber}
                </Text>
              </Pressable>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) => updateSet({ ...set, repsDone: value })}
                placeholder="reps"
                style={[sharedStyles.input, { flex: 1 }]}
                value={set.repsDone}
              />
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) => updateSet({ ...set, loadKg: value })}
                placeholder="kg"
                style={[sharedStyles.input, { flex: 1 }]}
                value={set.loadKg}
              />
            </View>
          ))}
        </View>
      ))}
      <Pressable disabled={saving} onPress={finish} style={sharedStyles.button}>
        <Text style={sharedStyles.buttonText}>
          {saving ? 'Finalizando...' : 'Finalizar treino'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

async function loadWorkoutDay(api: ReturnType<typeof useApiClient>, userId: string, dayId: string) {
  const summaries = await api.request<{ items: WorkoutPlanSummary[] }>(
    `/students/${userId}/workout-plans`,
  );
  const active = summaries.items.find((plan) => plan.status === 'active') ?? summaries.items[0];
  if (!active) throw new Error('sem plano');
  const plan = await api.request<WorkoutPlan>(`/workout-plans/${active.id}`);
  const day = plan.days.find((candidate) => candidate.id === dayId);
  if (!day) throw new Error('dia nao encontrado');
  return day;
}

function buildInitialSets(exercises: WorkoutExercise[]): SetState[] {
  return exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, index) => ({
      workoutExerciseId: exercise.id,
      setNumber: index + 1,
      repsDone: '',
      loadKg: exercise.loadKg === null ? '' : String(exercise.loadKg),
      completed: false,
    })),
  );
}

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}
