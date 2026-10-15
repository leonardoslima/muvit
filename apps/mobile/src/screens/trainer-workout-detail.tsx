import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { getTrainerWorkoutPlan } from '../application/workouts/trainer-workout-data';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { Button } from '../components/ui/v2/button';
import { Card } from '../components/ui/v2/card';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { WorkoutDayCard } from '../components/workouts/workout-day-card';
import { WorkoutStatusBadge } from '../components/workouts/workout-status-badge';
import { ApiError } from '../lib/api';
import { authClient } from '../lib/auth-client';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerWorkoutDetailScreen(): React.JSX.Element {
  const api = useApiClient();
  const session = authClient.useSession();
  const authUserId = session.data?.user.id ?? '';
  const params = useLocalSearchParams<{
    studentId?: string | string[];
    planId?: string | string[];
  }>();
  const studentId = firstParam(params.studentId);
  const planId = firstParam(params.planId);
  const query = useQuery({
    enabled: Boolean(authUserId && studentId && planId),
    queryKey: ['trainer', 'workout', planId, studentId, authUserId] as const,
    queryFn: ({ signal }) => {
      if (!planId || !studentId || !authUserId) throw new Error('Treino inválido.');
      return getTrainerWorkoutPlan(api, planId, signal);
    },
  });

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;
  const hasData = Boolean(query.data);
  const isInitialError = query.isError && !hasData;
  const isLoading =
    session.isPending || Boolean(authUserId && studentId && planId && query.isPending);
  const plan = query.data;
  const belongsToStudent = Boolean(plan && plan.studentId === studentId);

  function returnToWorkouts(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}/workouts`);
  }

  function refresh(): void {
    if (!authUserId || !studentId || !planId || isNotFound || (plan && !belongsToStudent)) return;
    void query.refetch();
  }

  function openEditor(): void {
    if (!studentId || !planId || query.isFetching || !plan || plan.status === 'archived') return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/[planId]/edit',
      params: { studentId, planId },
    });
  }

  let content: React.JSX.Element;
  if (!studentId || !planId) {
    content = (
      <StatePanel
        className="flex-1"
        description="Não foi possível identificar o treino solicitado."
        kind="error"
        title="Treino inválido"
      />
    );
  } else if (isLoading) {
    content = (
      <StatePanel
        className="flex-1"
        description="Estamos carregando a estrutura deste treino."
        kind="loading"
        title="Carregando treino"
      />
    );
  } else if (!authUserId) {
    content = (
      <StatePanel
        className="flex-1"
        description="Retorne à lista e tente abrir este treino novamente."
        kind="error"
        title="Sessão indisponível"
      />
    );
  } else if (isNotFound || (plan && !belongsToStudent)) {
    content = (
      <StatePanel
        className="flex-1"
        description="Este treino não está disponível para sua conta."
        kind="error"
        title="Treino não encontrado"
      />
    );
  } else if (isInitialError) {
    content = (
      <StatePanel
        className="flex-1"
        description="Verifique sua conexão e tente atualizar pelo cabeçalho."
        kind="error"
        title="Não foi possível carregar o treino"
      />
    );
  } else if (!plan) {
    content = (
      <StatePanel
        className="flex-1"
        description="Este treino não está disponível para sua conta."
        kind="error"
        title="Treino não encontrado"
      />
    );
  } else {
    const period = formatWorkoutPeriod(plan.startDate, plan.endDate);
    const notes = plan.notes?.trim();

    content = (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
      >
        <Card>
          <WorkoutStatusBadge status={plan.status} />
          {period ? <Text className="text-v2-secondary">{period}</Text> : null}
          {notes ? <Text className="text-v2-secondary">{plan.notes}</Text> : null}
        </Card>

        {plan.days.map((day) => (
          <WorkoutDayCard day={day} key={day.id} />
        ))}

        {query.isRefetchError ? (
          <Message title="Não foi possível atualizar o treino." variant="error" />
        ) : null}

        {plan.status !== 'archived' ? (
          <Button disabled={query.isFetching} label="Editar treino" onPress={openEditor} />
        ) : null}
      </ScrollView>
    );
  }

  const title = isNotFound || !belongsToStudent ? 'Treino' : (plan?.name ?? 'Treino');

  return (
    <TrainerScreen
      backLabel="Voltar para treinos"
      contextual
      onBack={returnToWorkouts}
      onRefresh={refresh}
      refreshDisabled={
        !authUserId ||
        !studentId ||
        !planId ||
        query.isFetching ||
        isNotFound ||
        Boolean(plan && !belongsToStudent)
      }
      refreshing={query.isRefetching && !isNotFound}
      title={title}
    >
      {content}
    </TrainerScreen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
