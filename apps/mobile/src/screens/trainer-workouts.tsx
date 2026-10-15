import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import {
  listTrainerWorkoutDrafts,
  listTrainerWorkoutPlans,
} from '../application/workouts/trainer-workout-data';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { Button } from '../components/ui/v2/button';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { WorkoutPlanListItem } from '../components/workouts/workout-plan-list-item';
import { ApiError } from '../lib/api';
import { authClient } from '../lib/auth-client';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerWorkoutsScreen(): React.JSX.Element {
  const api = useApiClient();
  const session = authClient.useSession();
  const authUserId = session.data?.user.id ?? '';
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const query = useQuery({
    enabled: Boolean(authUserId && studentId),
    queryKey: ['trainer', 'workouts', studentId, authUserId] as const,
    queryFn: async ({ signal }) => {
      if (!authUserId || !studentId) throw new Error('Contexto do aluno inválido.');

      const [plans, drafts] = await Promise.all([
        listTrainerWorkoutPlans(api, studentId, signal),
        listTrainerWorkoutDrafts(api, studentId, signal),
      ]);

      return { plans: plans.items, drafts: drafts.items };
    },
  });

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;
  const hasData = Boolean(query.data);
  const isInitialError = query.isError && !hasData;
  const isLoading = session.isPending || (Boolean(authUserId) && query.isPending);
  const plans = query.data?.plans.filter((plan) => plan.studentId === studentId) ?? [];
  const drafts = query.data?.drafts.filter((draft) => draft.studentId === studentId) ?? [];
  const isEmpty = hasData && plans.length === 0 && drafts.length === 0;
  const hasRefreshError = query.isRefetchError;

  function returnToStudent(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}`);
  }

  function refresh(): void {
    if (!authUserId || !studentId || isNotFound) return;
    void query.refetch();
  }

  function openWorkout(planId: string): void {
    if (!studentId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/[planId]',
      params: { studentId, planId },
    });
  }

  function openDraft(draftId: string, sourcePlanId: string | null): void {
    if (!studentId || query.isFetching) return;
    if (sourcePlanId) {
      router.push({
        pathname: '/trainer/students/[studentId]/workouts/[planId]/edit',
        params: { studentId, planId: sourcePlanId, draftId },
      });
      return;
    }

    router.push({
      pathname: '/trainer/students/[studentId]/workouts/new',
      params: { studentId, draftId },
    });
  }

  function openNewWorkout(): void {
    if (!studentId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/new',
      params: { studentId },
    });
  }

  let content: React.JSX.Element;
  if (!studentId) {
    content = (
      <StatePanel
        className="flex-1"
        description="Não foi possível identificar o aluno solicitado."
        kind="error"
        title="Aluno inválido"
      />
    );
  } else if (isLoading) {
    content = (
      <StatePanel
        className="flex-1"
        description="Estamos carregando os treinos deste aluno."
        kind="loading"
        title="Carregando treinos"
      />
    );
  } else if (!authUserId) {
    content = (
      <StatePanel
        className="flex-1"
        description="Retorne ao aluno e tente abrir os treinos novamente."
        kind="error"
        title="Sessão indisponível"
      />
    );
  } else if (isNotFound) {
    content = (
      <StatePanel
        className="flex-1"
        description="Estes treinos não estão disponíveis para sua conta."
        kind="error"
        title="Treinos não encontrados"
      />
    );
  } else if (isInitialError) {
    content = (
      <StatePanel
        className="flex-1"
        description="Verifique sua conexão e tente atualizar pelo cabeçalho."
        kind="error"
        title="Não foi possível carregar os treinos"
      />
    );
  } else {
    content = (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
      >
        <Button disabled={query.isFetching} label="Novo treino" onPress={openNewWorkout} />

        {drafts.length > 0 ? (
          <ViewSection title="Rascunhos">
            {drafts.map((draft) => (
              <WorkoutPlanListItem
                disabled={query.isFetching}
                draft={draft}
                key={draft.id}
                onPress={() => openDraft(draft.id, draft.sourcePlanId)}
              />
            ))}
          </ViewSection>
        ) : null}

        {isEmpty ? (
          <StatePanel
            description="Crie uma prescrição para começar o acompanhamento."
            kind="empty"
            title="Nenhum treino cadastrado"
          />
        ) : null}

        {plans.map((plan) => (
          <WorkoutPlanListItem
            disabled={query.isFetching}
            key={plan.id}
            onPress={() => openWorkout(plan.id)}
            plan={plan}
          />
        ))}

        {hasRefreshError ? (
          <Message title="Não foi possível atualizar os treinos." variant="error" />
        ) : null}
      </ScrollView>
    );
  }

  return (
    <TrainerScreen
      backLabel={studentId ? 'Voltar para aluno' : 'Voltar para alunos'}
      contextual
      onBack={returnToStudent}
      onRefresh={refresh}
      refreshDisabled={!authUserId || !studentId || query.isFetching || isNotFound}
      refreshing={query.isRefetching && !isNotFound}
      subtitle="Consulte e mantenha a prescrição de treino deste aluno."
      title="Treinos"
    >
      {content}
    </TrainerScreen>
  );
}

function ViewSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View className="gap-2">
      <Text variant="sectionTitle">{title}</Text>
      {children}
    </View>
  );
}
