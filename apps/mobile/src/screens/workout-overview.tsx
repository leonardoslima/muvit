import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useRef } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { estimateWorkoutDuration, loadWorkoutDay } from '../application/workouts/today-workout';
import { Screen } from '../components/ui/screen';
import { Button } from '../components/ui/v2/button';
import { IconButton } from '../components/ui/v2/icon-button';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Surface } from '../components/ui/v2/surface';
import { Text } from '../components/ui/v2/text';
import { StudentExerciseList } from '../components/workouts/student-exercise-list';
import { authClient } from '../lib/auth-client';
import { colors, spacing } from '../lib/design-system/tokens';
import { muscleGroupLabel } from '../lib/muscle-groups';
import { useApiClient } from '../lib/use-api';

export function WorkoutOverviewScreen(): React.JSX.Element {
  const api = useApiClient();
  const authUserId = authClient.useSession().data?.user.id;
  const params = useLocalSearchParams<{ dayId: string }>();
  const dayId = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const retryContext = JSON.stringify([authUserId ?? null, dayId ?? null]);
  const retryingContexts = useRef(new Set<string>());

  const query = useQuery({
    enabled: Boolean(authUserId && dayId),
    queryKey: ['workout-overview', authUserId, dayId],
    queryFn: async () => {
      if (!authUserId || !dayId) throw new Error('Treino não encontrado.');
      return loadWorkoutDay({ api, dayId });
    },
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const retry = () => {
    if (query.isFetching || retryingContexts.current.has(retryContext)) return;
    retryingContexts.current.add(retryContext);
    void query.refetch().finally(() => {
      retryingContexts.current.delete(retryContext);
    });
  };

  const header = <OverviewHeader onBack={goBack} />;

  if (!query.data && (query.isLoading || query.isFetching || query.isPending)) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        {header}
        <View className="flex-grow justify-center">
          <StatePanel
            description="Estamos buscando os exercícios do treino."
            kind="loading"
            title="Carregando treino"
          />
        </View>
      </Screen>
    );
  }

  if (!query.data) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        {header}
        <View className="flex-grow justify-center">
          <StatePanel
            action={{ label: 'Tentar novamente', onPress: retry }}
            description="Verifique sua conexão e tente novamente."
            kind="error"
            title="Não foi possível carregar o treino"
          />
        </View>
      </Screen>
    );
  }

  const day = query.data;
  const hasRefreshError = Boolean(query.error && query.data);

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {header}
      {hasRefreshError ? (
        <Message
          action={{
            label: query.isFetching ? 'Atualizando…' : 'Tentar novamente',
            onPress: retry,
            disabled: query.isFetching,
            loading: query.isFetching,
          }}
          description="Seu treino continua disponível. Tente atualizar novamente."
          title="Não foi possível atualizar"
          variant="error"
        />
      ) : null}

      <Surface variant="subtle" className="gap-2 rounded-v2-card p-5">
        <Text variant="sectionTitle">{day.label}</Text>
        <Text className="text-v2-secondary" variant="body">
          {day.exercises.length} exercícios · ~{estimateWorkoutDuration(day)} min estimados
        </Text>
        <Text className="text-v2-brand" variant="label">
          {getMuscleGroups(day)}
        </Text>
      </Surface>

      <View className="gap-4">
        <Text variant="sectionTitle">Exercícios</Text>
        <StudentExerciseList
          day={day}
          onExercisePress={(exerciseId) => {
            router.push({
              pathname: '/exercise/[dayId]/[exerciseId]',
              params: { dayId: day.id, exerciseId, source: 'overview' },
            });
          }}
          variant="detailed"
        />
      </View>

      <Button label="Iniciar treino" onPress={() => router.push(`/session/${day.id}`)} />
    </Screen>
  );
}

function OverviewHeader({ onBack }: { onBack: () => void }): React.JSX.Element {
  return (
    <View className="gap-6">
      <View className="flex-row items-center gap-3">
        <IconButton
          accessibilityLabel="Voltar para Hoje"
          icon={<ArrowLeft size={20} color={colors.brand} accessible={false} />}
          onPress={onBack}
        />
        <Text className="text-v2-brand" variant="label">
          Hoje
        </Text>
      </View>
      <View className="gap-3">
        <Text variant="screenTitle">Visão geral do treino</Text>
        <Text className="text-v2-secondary" variant="body">
          Confira os exercícios antes de começar.
        </Text>
      </View>
    </View>
  );
}

function getMuscleGroups(day: { exercises: { exercise: { muscleGroup: string } }[] }): string {
  return [
    ...new Set(day.exercises.map((item) => muscleGroupLabel(item.exercise.muscleGroup))),
  ].join(' · ');
}

const styles = {
  content: {
    flexGrow: 1,
    gap: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
};
