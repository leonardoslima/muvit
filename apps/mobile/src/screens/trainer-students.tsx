import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  TRAINER_STUDENTS_PAGE_SIZE,
  listTrainerStudents,
} from '../application/trainer/trainer-data';
import { StudentListItem } from '../components/trainer/student-list-item';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { Button } from '../components/ui/v2/button';
import { Field } from '../components/ui/v2/field';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerStudentsScreen(): React.JSX.Element {
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
  const refreshing = query.isRefetching && !query.isFetchingNextPage && hasData;
  const subtitle = query.data
    ? `${total} alunos ${appliedSearch ? 'encontrados' : 'vinculados'}`
    : 'Localize e abra alunos vinculados à sua conta.';

  const applySearch = (): void => {
    setAppliedSearch(searchInput.trim());
  };

  const clearSearch = (): void => {
    setSearchInput('');
    setAppliedSearch('');
  };

  const openStudent = (studentId: string): void => {
    router.push({
      pathname: '/trainer/students/[studentId]',
      params: { studentId },
    });
  };

  const refresh = (): void => {
    void query.refetch();
  };

  if (query.isPending) {
    return (
      <TrainerScreen onRefresh={refresh} refreshDisabled title="Alunos">
        <StatePanel
          description="Estamos carregando os alunos vinculados à sua conta."
          kind="loading"
          title="Carregando alunos"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  if (isInitialError) {
    return (
      <TrainerScreen onRefresh={refresh} refreshDisabled={query.isFetching} title="Alunos">
        <StatePanel
          description="Verifique sua conexão e atualize para tentar novamente."
          kind="error"
          title="Não foi possível carregar seus alunos"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  return (
    <TrainerScreen
      onRefresh={refresh}
      refreshDisabled={query.isFetching}
      refreshing={refreshing}
      subtitle={subtitle}
      title="Alunos"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          autoCapitalize="words"
          kind="search"
          label="Buscar aluno"
          onChangeText={setSearchInput}
          onSubmitEditing={applySearch}
          placeholder="Nome do aluno"
          returnKeyType="search"
          value={searchInput}
        />
        <Button compact label="Buscar" onPress={applySearch} />
        {searchInput || appliedSearch ? (
          <Button compact label="Limpar busca" onPress={clearSearch} variant="secondary" />
        ) : null}

        {isSearchEmpty ? (
          <StatePanel
            description="Tente outro nome ou volte para a carteira completa."
            kind="empty"
            title="Nenhum aluno encontrado"
          />
        ) : null}

        {isPortfolioEmpty ? (
          <StatePanel
            description="Nenhum aluno vinculado para acompanhar no momento."
            kind="empty"
            title="Nenhum aluno vinculado"
          />
        ) : null}

        {students.map((student) => (
          <StudentListItem
            key={student.id}
            onPress={() => openStudent(student.id)}
            student={student}
          />
        ))}

        {students.length > 0 ? (
          <Text className="text-center text-v2-secondary" variant="support">
            {students.length} de {total} alunos carregados
          </Text>
        ) : null}

        {hasRefreshError ? (
          <Message title="Não foi possível atualizar a lista." variant="error" />
        ) : null}
        {hasPaginationError ? (
          <>
            <Message title="Não foi possível carregar mais alunos." variant="error" />
            <Button
              compact
              disabled={query.isFetching}
              label={query.isFetchingNextPage ? 'Carregando mais...' : 'Tentar carregar mais'}
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
              variant="secondary"
            />
          </>
        ) : null}

        {query.hasNextPage && !hasPaginationError ? (
          <Button
            compact
            disabled={query.isFetching}
            label={query.isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais'}
            loading={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
            variant="secondary"
          />
        ) : null}

        {!query.hasNextPage && students.length > 0 ? (
          <Text className="text-center text-v2-secondary" variant="support">
            Todos os alunos carregados
          </Text>
        ) : null}
      </ScrollView>
    </TrainerScreen>
  );
}
