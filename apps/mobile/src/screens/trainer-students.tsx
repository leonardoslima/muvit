import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  TRAINER_STUDENTS_PAGE_SIZE,
  listTrainerStudents,
} from '../application/trainer/trainer-data';
import { StudentListItem } from '../components/trainer/student-list-item';
import { AppButton } from '../components/ui/button';
import { Field } from '../components/ui/field';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerStudentsScreen() {
  const api = useApiClient();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['trainer', 'students', appliedSearch],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      listTrainerStudents(api, {
        q: appliedSearch,
        limit: TRAINER_STUDENTS_PAGE_SIZE,
        offset: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((total, page) => total + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const students = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const hasData = Boolean(query.data);
  const isInitialError = query.isError && !hasData;
  const isSearchEmpty = Boolean(appliedSearch) && hasData && total === 0;
  const isPortfolioEmpty = !appliedSearch && hasData && total === 0;
  const hasPaginationError = query.isFetchNextPageError;
  const hasRefreshError = query.isRefetchError && !hasPaginationError;

  function applySearch(): void {
    setAppliedSearch(searchInput.trim());
  }

  function clearSearch(): void {
    setSearchInput('');
    setAppliedSearch('');
  }

  function openStudent(studentId: string): void {
    router.push({
      pathname: '/trainer/students/[studentId]',
      params: { studentId },
    });
  }

  if (query.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando os alunos vinculados à sua conta."
          title="Carregando alunos"
          tone="loading"
        />
      </Screen>
    );
  }

  if (isInitialError) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar seus alunos"
          tone="error"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader subtitle="Localize e abra um aluno vinculado à sua conta." title="Alunos" />

      <Field
        autoCapitalize="words"
        label="Buscar aluno"
        onChangeText={setSearchInput}
        onSubmitEditing={applySearch}
        placeholder="Nome do aluno"
        returnKeyType="search"
        value={searchInput}
      />
      <AppButton label="Buscar" onPress={applySearch} />
      {searchInput || appliedSearch ? (
        <AppButton label="Limpar busca" onPress={clearSearch} variant="secondary" />
      ) : null}

      {isSearchEmpty ? (
        <StatePanel
          actionLabel="Limpar busca"
          description="Tente outro nome ou volte para a carteira completa."
          onAction={clearSearch}
          title="Nenhum aluno encontrado"
          tone="empty"
        />
      ) : null}

      {isPortfolioEmpty ? (
        <StatePanel
          description="Nenhum aluno vinculado para acompanhar no momento."
          title="Nenhum aluno vinculado"
          tone="empty"
        />
      ) : null}

      {students.map((student) => (
        <StudentListItem
          key={student.id}
          onPress={() => openStudent(student.id)}
          student={student}
        />
      ))}

      {hasRefreshError ? (
        <InlineMessage message="Não foi possível atualizar a lista." tone="error" />
      ) : null}
      {hasPaginationError ? (
        <>
          <InlineMessage message="Não foi possível carregar mais alunos." tone="error" />
          <AppButton
            label="Tentar carregar mais"
            onPress={() => void query.fetchNextPage()}
            variant="secondary"
          />
        </>
      ) : null}

      {query.hasNextPage && !hasPaginationError ? (
        <AppButton
          disabled={query.isFetchingNextPage}
          label={query.isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais'}
          onPress={() => void query.fetchNextPage()}
          variant="secondary"
        />
      ) : null}

      <AppButton
        disabled={query.isRefetching}
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
