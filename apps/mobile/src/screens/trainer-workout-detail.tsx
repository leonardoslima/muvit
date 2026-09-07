import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { getTrainerWorkoutPlan } from '../application/workouts/trainer-workout-data';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { WorkoutDayCard } from '../components/workouts/workout-day-card';
import { WorkoutStatusBadge } from '../components/workouts/workout-status-badge';
import { ApiError } from '../lib/api';
import { sharedStyles, spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerWorkoutDetailScreen() {
  const api = useApiClient();
  const params = useLocalSearchParams<{
    studentId?: string | string[];
    planId?: string | string[];
  }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const query = useQuery({
    enabled: Boolean(studentId && planId),
    queryKey: ['trainer', 'workout', planId],
    queryFn: ({ signal }) => {
      if (!planId) throw new Error('Treino inválido.');
      return getTrainerWorkoutPlan(api, planId, signal);
    },
  });

  function returnToWorkouts(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }
    router.dismissTo(`/trainer/students/${studentId}/workouts`);
  }

  function openEditor(): void {
    if (!studentId || !planId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/[planId]/edit',
      params: { studentId, planId },
    });
  }

  if (!studentId || !planId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Não foi possível identificar o treino solicitado."
          onAction={returnToWorkouts}
          title="Treino inválido"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando a estrutura deste treino."
          title="Carregando treino"
          tone="loading"
        />
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;
  if (isNotFound) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não está disponível para sua conta."
          onAction={returnToWorkouts}
          title="Treino não encontrado"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionDisabled={query.isFetching}
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar o treino"
          tone="error"
        />
      </Screen>
    );
  }

  const plan = query.data;
  if (!plan) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não está disponível para sua conta."
          onAction={returnToWorkouts}
          title="Treino não encontrado"
          tone="error"
        />
      </Screen>
    );
  }

  if (plan.studentId !== studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não pertence ao aluno aberto neste contexto."
          onAction={returnToWorkouts}
          title="Treino indisponível"
          tone="error"
        />
      </Screen>
    );
  }

  const period = formatWorkoutPeriod(plan.startDate, plan.endDate);
  const notes = plan.notes?.trim();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton label="Voltar para treinos" onPress={returnToWorkouts} variant="secondary" />
      <ScreenHeader eyebrow="Treino" title={plan.name} />

      <Card>
        <WorkoutStatusBadge status={plan.status} />
        {period ? <Text style={sharedStyles.subtitle}>{period}</Text> : null}
        {notes ? <Text style={sharedStyles.subtitle}>{notes}</Text> : null}
      </Card>

      {plan.days.map((day) => (
        <WorkoutDayCard day={day} key={day.id} />
      ))}

      {query.isRefetchError ? (
        <InlineMessage message="Não foi possível atualizar o treino." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isRefetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />
      {plan.status !== 'archived' ? (
        <AppButton disabled={query.isFetching} label="Editar treino" onPress={openEditor} />
      ) : null}
    </Screen>
  );
}

function formatWorkoutPeriod(startDate: string | null, endDate: string | null): string | undefined {
  if (startDate && endDate) {
    return `${formatDate(startDate)} — ${formatDate(endDate)}`;
  }
  if (startDate) return `A partir de ${formatDate(startDate)}`;
  if (endDate) return `Até ${formatDate(endDate)}`;
  return undefined;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
});
