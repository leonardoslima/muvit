import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import {
  type AssessmentsPage,
  TRAINER_ASSESSMENTS_PAGE_SIZE,
  listAssessments,
} from '../application/assessments/assessment-data';
import { AssessmentHeading } from '../components/assessments/assessment-heading';
import { AssessmentListItem } from '../components/assessments/assessment-list-item';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { ActionFeedback } from '../components/ui/v2/action-feedback';
import { Button } from '../components/ui/v2/button';
import { StatePanel } from '../components/ui/v2/state-panel';
import { ApiError } from '../lib/api';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerAssessmentsScreen(): React.JSX.Element {
  const api = useApiClient();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const query = useInfiniteQuery({
    enabled: Boolean(studentId),
    queryKey: ['trainer', 'assessments', studentId],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      if (!studentId) throw new Error('Aluno inválido.');

      return listAssessments(
        api,
        { kind: 'student', studentId },
        {
          limit: TRAINER_ASSESSMENTS_PAGE_SIZE,
          offset: pageParam,
          signal,
        },
      );
    },
    getNextPageParam: (lastPage: AssessmentsPage, pages: AssessmentsPage[]) => {
      const loaded = pages.reduce((total, page) => total + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const assessments = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const hasData = Boolean(query.data);
  const isInitialError = query.isError && !hasData;
  const hasPaginationError = query.isFetchNextPageError;
  const hasRefreshError = query.isRefetchError && !hasPaginationError;
  const isNotFound = query.error instanceof ApiError && query.error.status === 404;

  function returnToStudent(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}`);
  }

  function refreshAssessments(): void {
    if (!studentId || isNotFound) return;

    void query.refetch();
  }

  function openAssessment(assessmentId: string): void {
    if (!studentId) return;

    router.push({
      pathname: '/trainer/students/[studentId]/assessments/[assessmentId]',
      params: { studentId, assessmentId },
    });
  }

  function openNewAssessment(): void {
    if (!studentId) return;

    router.push({
      pathname: '/trainer/students/[studentId]/assessments/new',
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
  } else if (query.isPending) {
    content = (
      <StatePanel
        className="flex-1"
        description="Estamos buscando o histórico deste aluno."
        kind="loading"
        title="Carregando avaliações"
      />
    );
  } else if (isNotFound) {
    content = (
      <StatePanel
        className="flex-1"
        description="Estas avaliações não estão disponíveis para sua conta."
        kind="error"
        title="Avaliações não encontradas"
      />
    );
  } else if (isInitialError) {
    content = (
      <StatePanel
        className="flex-1"
        description="Verifique sua conexão e tente atualizar pelo cabeçalho."
        kind="error"
        title="Não foi possível carregar as avaliações"
      />
    );
  } else {
    const isEmpty = hasData && total === 0;

    content = (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.xxl,
          paddingTop: spacing.sm,
        }}
      >
        <AssessmentHeading
          subtitle="Histórico de medidas e avaliações deste aluno."
          title="Avaliações"
        />
        <Button label="Nova avaliação" onPress={openNewAssessment} />

        {isEmpty ? (
          <StatePanel
            description="Registre uma avaliação para acompanhar a evolução deste aluno."
            kind="empty"
            title="Nenhuma avaliação registrada"
          />
        ) : null}

        {assessments.map((assessment) => (
          <AssessmentListItem
            assessment={assessment}
            key={assessment.id}
            onPress={() => openAssessment(assessment.id)}
          />
        ))}

        {hasRefreshError ? (
          <ActionFeedback
            eventKey={query.errorUpdatedAt}
            title="Não foi possível atualizar as avaliações."
            variant="error"
          />
        ) : null}

        {hasPaginationError ? (
          <ActionFeedback
            eventKey={query.errorUpdatedAt}
            title="Não foi possível carregar mais avaliações."
            variant="error"
          />
        ) : null}

        {query.hasNextPage ? (
          <Button
            disabled={query.isFetching}
            label={
              query.isFetchingNextPage
                ? 'Carregando mais...'
                : hasPaginationError
                  ? 'Tentar carregar mais'
                  : 'Carregar mais'
            }
            onPress={() => void query.fetchNextPage()}
            variant="secondary"
          />
        ) : null}
      </ScrollView>
    );
  }

  return (
    <TrainerScreen
      backLabel={studentId ? 'Voltar para aluno' : 'Voltar para alunos'}
      contextual
      onBack={returnToStudent}
      onRefresh={refreshAssessments}
      refreshDisabled={!studentId || query.isFetching || isNotFound}
      refreshing={hasData && query.isRefetching && !query.isFetchingNextPage && !isNotFound}
      title={studentId ? 'Aluno' : 'Alunos'}
    >
      {content}
    </TrainerScreen>
  );
}
