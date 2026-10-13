import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useEffect, useRef } from 'react';
import type * as React from 'react';
import { AccessibilityInfo, View, findNodeHandle } from 'react-native';
import type { Text as NativeText } from 'react-native';
import type { WorkoutDay } from '../application/workouts/today-workout';
import { loadWorkoutDay } from '../application/workouts/today-workout';
import { Screen } from '../components/ui/screen';
import { IconButton } from '../components/ui/v2/icon-button';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Surface } from '../components/ui/v2/surface';
import { Text } from '../components/ui/v2/text';
import { authClient } from '../lib/auth-client';
import { colors, spacing } from '../lib/design-system/tokens';
import { muscleGroupLabel } from '../lib/muscle-groups';
import { useApiClient } from '../lib/use-api';
import {
  type WorkoutExerciseSource,
  getWorkoutExerciseContext,
  useWorkoutExerciseSourceVersion,
} from '../lib/workout-exercise-context';

type WorkoutExerciseSelection = {
  day: WorkoutDay;
  exercise: WorkoutDay['exercises'][number];
  stale: boolean;
};

export function WorkoutExerciseScreen(): React.JSX.Element {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const session = authClient.useSession();
  const authUserId = session.data?.user.id;
  const params = useLocalSearchParams<{
    dayId?: string | string[];
    exerciseId?: string | string[];
    source?: string | string[];
  }>();
  const dayId = getSingleParam(params.dayId);
  const exerciseId = getSingleParam(params.exerciseId);
  const source = resolveSource(params.source);
  const titleRef = useRef<NativeText | null>(null);
  const retryingContexts = useRef(new Set<string>());

  const sourceVersion = useWorkoutExerciseSourceVersion({
    queryClient,
    authUserId,
    dayId,
    source,
  });
  const queryKey = [
    'workout-exercise',
    authUserId,
    dayId,
    exerciseId,
    source,
    sourceVersion,
  ] as const;
  const hasContextParams = Boolean(authUserId && dayId && exerciseId);
  const query = useQuery<WorkoutExerciseSelection, Error>({
    enabled: hasContextParams,
    queryKey,
    queryFn: async ({ signal }) => {
      if (!authUserId || !dayId || !exerciseId) {
        throw new Error('Não foi possível abrir este exercício.');
      }

      const cachedContext = getWorkoutExerciseContext({
        queryClient,
        authUserId,
        dayId,
        exerciseId,
        source,
      });
      const day = cachedContext?.day ?? (await loadWorkoutDay({ api, dayId }));
      if (signal.aborted) throw new Error('Consulta do exercício cancelada.');

      const exercise = day.exercises.find((item) => item.id === exerciseId);
      if (!exercise) throw new Error('Exercício não encontrado.');

      return { day, exercise, stale: cachedContext?.stale ?? false };
    },
  });

  const retryContext = JSON.stringify([
    authUserId ?? null,
    dayId ?? null,
    exerciseId ?? null,
    source,
  ]);

  const retry = useCallback(() => {
    if (!hasContextParams || query.isFetching || retryingContexts.current.has(retryContext)) return;
    retryingContexts.current.add(retryContext);
    void query.refetch().finally(() => {
      retryingContexts.current.delete(retryContext);
    });
  }, [hasContextParams, query, retryContext]);

  const focusTitle = useCallback(() => {
    const node = findNodeHandle(titleRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  useEffect(() => {
    if (hasContextParams && query.isPending && !query.data) return undefined;
    focusTitle();
    return navigation.addListener('focus', focusTitle);
  }, [focusTitle, hasContextParams, navigation, query.data, query.isPending]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(source === 'overview' && dayId ? `/log/${dayId}` : '/');
  };

  const header = (
    <View className="gap-6">
      <View className="flex-row items-center gap-3">
        <IconButton
          accessibilityLabel="Voltar ao treino"
          icon={<ArrowLeft size={20} color={colors.brand} accessible={false} />}
          onPress={goBack}
        />
        <Text className="text-v2-brand" variant="label">
          Treino
        </Text>
      </View>
      {query.data ? (
        <View className="gap-2">
          <Text ref={titleRef} accessibilityRole="header" variant="screenTitle">
            {query.data.exercise.exercise.name}
          </Text>
          <Text className="text-v2-secondary" variant="body">
            {muscleGroupLabel(query.data.exercise.exercise.muscleGroup)}
          </Text>
        </View>
      ) : (
        <Text ref={titleRef} accessibilityRole="header" variant="screenTitle">
          Exercício
        </Text>
      )}
    </View>
  );

  if (!query.data && hasContextParams && (query.isLoading || query.isFetching || query.isPending)) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        {header}
        <View className="flex-grow justify-center">
          <StatePanel
            description="Estamos buscando a prescrição deste exercício."
            kind="loading"
            title="Carregando exercício"
          />
        </View>
      </Screen>
    );
  }

  if (!query.data) {
    const title = query.error?.message.includes('Exercício não encontrado')
      ? 'Exercício não encontrado'
      : 'Não foi possível carregar o exercício';
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        {header}
        <View className="flex-grow justify-center">
          <StatePanel
            action={{
              label: query.isFetching ? 'Atualizando…' : 'Tentar novamente',
              onPress: retry,
              disabled: !hasContextParams || query.isFetching,
              loading: query.isFetching,
            }}
            description={
              hasContextParams
                ? 'Confira sua conexão e tente novamente.'
                : 'Volte ao treino e abra um exercício da lista.'
            }
            kind="error"
            title={title}
          />
        </View>
      </Screen>
    );
  }

  const { exercise } = query.data;
  const observation = exercise.notes?.trim();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {header}
      <View className="gap-3">
        <Text variant="sectionTitle">Prescrição</Text>
        <Text variant="action">
          {exercise.sets} séries · {exercise.reps} repetições
        </Text>
        <Text className="text-v2-secondary" variant="body">
          Descanso: {exercise.restSeconds ?? 0} s
        </Text>
      </View>
      {observation ? (
        <Surface variant="subtle" className="gap-2 rounded-v2-card p-4">
          <Text className="text-v2-brand" variant="label">
            Observação
          </Text>
          <Text>{observation}</Text>
        </Surface>
      ) : null}
      {query.error ? (
        <Message
          title="Não foi possível atualizar"
          description="A prescrição continua disponível nesta tela."
          variant="error"
          action={{ label: query.isFetching ? 'Atualizando…' : 'Tentar novamente', onPress: retry }}
        />
      ) : null}
    </Screen>
  );
}

function getSingleParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolveSource(value?: string | string[]): WorkoutExerciseSource {
  const source = getSingleParam(value);
  return source === 'today' ? 'today' : 'overview';
}

const styles = {
  content: {
    flexGrow: 1,
    gap: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
};
