import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import {
  type TrainerWorkoutPlanSummary,
  listTrainerWorkoutPlans,
} from '../application/workouts/trainer-workout-data';
import { AppButton } from '../components/ui/button';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { WorkoutPlanListItem } from '../components/workouts/workout-plan-list-item';
import { ApiError } from '../lib/api';
import { spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerWorkoutsScreen() {
  const api = useApiClient();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const query = useQuery({
    enabled: Boolean(studentId),
    queryKey: ['trainer', 'workouts', studentId],
    queryFn: ({ signal }) => {
      if (!studentId) throw new Error('Aluno inválido.');
      return listTrainerWorkoutPlans(api, studentId, signal);
    },
  });

  function returnToStudent(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }
    router.dismissTo(`/trainer/students/${studentId}`);
  }

  function openWorkout(planId: string): void {
    if (!studentId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/[planId]',
      params: { studentId, planId },
    });
  }

  function openNewWorkout(): void {
    if (!studentId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/new',
      params: { studentId },
    });
  }

  if (!studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para alunos"
          description="Não foi possível identificar o aluno solicitado."
          onAction={returnToStudent}
          title="Aluno inválido"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando os treinos deste aluno."
          title="Carregando treinos"
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
          actionLabel="Voltar para aluno"
          description="Estes treinos não estão disponíveis para sua conta."
          onAction={returnToStudent}
          title="Treinos não encontrados"
          tone="error"
        />
      </Screen>
    );
  }

  const hasData = Boolean(query.data);
  if (query.isError && !hasData) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionDisabled={query.isFetching}
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar os treinos"
          tone="error"
        />
      </Screen>
    );
  }

  const plans: TrainerWorkoutPlanSummary[] = query.data?.items ?? [];
  const isEmpty = hasData && plans.length === 0;
  const hasRefreshError = query.isRefetchError;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton label="Voltar para aluno" onPress={returnToStudent} variant="secondary" />
      <ScreenHeader
        subtitle="Consulte e mantenha a prescrição de treino deste aluno."
        title="Treinos"
      />
      <AppButton disabled={query.isFetching} label="Novo treino" onPress={openNewWorkout} />

      {isEmpty ? (
        <StatePanel
          description="Crie uma prescrição para começar o acompanhamento."
          title="Nenhum treino cadastrado"
          tone="empty"
        />
      ) : null}

      {plans.map((plan) => (
        <WorkoutPlanListItem key={plan.id} onPress={() => openWorkout(plan.id)} plan={plan} />
      ))}

      {hasRefreshError ? (
        <InlineMessage message="Não foi possível atualizar os treinos." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isFetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
});
