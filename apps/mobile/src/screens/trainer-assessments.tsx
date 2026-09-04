import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import {
  type AssessmentsPage,
  TRAINER_ASSESSMENTS_PAGE_SIZE,
  listAssessments,
} from '../application/assessments/assessment-data';
import { AssessmentListItem } from '../components/assessments/assessment-list-item';
import { AppButton } from '../components/ui/button';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerAssessmentsScreen() {
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

  function returnToStudent(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}`);
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
          description="Estamos buscando o histórico deste aluno."
          title="Carregando avaliações"
          tone="loading"
        />
      </Screen>
    );
  }

  if (isInitialError) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionDisabled={query.isFetching}
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar as avaliações"
          tone="error"
        />
      </Screen>
    );
  }

  function openAssessment(assessmentId: string): void {
    router.push({
      pathname: '/trainer/students/[studentId]/assessments/[assessmentId]',
      params: { studentId, assessmentId },
    });
  }

  function openNewAssessment(): void {
    router.push({
      pathname: '/trainer/students/[studentId]/assessments/new',
      params: { studentId },
    });
  }

  const isEmpty = hasData && total === 0;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton label="Voltar para aluno" onPress={returnToStudent} variant="secondary" />
      <ScreenHeader
        subtitle="Consulte o histórico de medidas e avaliações deste aluno."
        title="Avaliações"
      />
      <AppButton label="Nova avaliação" onPress={openNewAssessment} />

      {isEmpty ? (
        <StatePanel
          description="Registre uma avaliação para acompanhar a evolução deste aluno."
          title="Nenhuma avaliação registrada"
          tone="empty"
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
        <InlineMessage message="Não foi possível atualizar as avaliações." tone="error" />
      ) : null}

      {hasPaginationError ? (
        <>
          <InlineMessage message="Não foi possível carregar mais avaliações." tone="error" />
          <AppButton
            disabled={query.isFetching}
            label={query.isFetchingNextPage ? 'Carregando mais...' : 'Tentar carregar mais'}
            onPress={() => void query.fetchNextPage()}
            variant="secondary"
          />
        </>
      ) : null}

      {query.hasNextPage && !hasPaginationError ? (
        <AppButton
          disabled={query.isFetching}
          label={query.isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais'}
          onPress={() => void query.fetchNextPage()}
          variant="secondary"
        />
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
