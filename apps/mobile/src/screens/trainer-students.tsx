import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  TRAINER_STUDENTS_PAGE_SIZE,
  listTrainerStudents,
} from '../application/trainer/trainer-data';
import { StudentListItem } from '../components/trainer/student-list-item';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { ActionFeedback } from '../components/ui/v2/action-feedback';
import { Button } from '../components/ui/v2/button';
import { Field } from '../components/ui/v2/field';
import { IconButton } from '../components/ui/v2/icon-button';
import { KeyboardScrollView } from '../components/ui/v2/keyboard-scroll-view';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { colors, spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerStudentsScreen(): React.JSX.Element {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const search = searchInput.trim();
  const isSearchChanging = search !== appliedSearch;

  useEffect(() => {
    if (search === appliedSearch) return;
    const timeout = setTimeout(() => setAppliedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search, appliedSearch]);

  const query = useInfiniteQuery({
    queryKey: ['trainer', 'students', appliedSearch],
    enabled: !isSearchChanging,
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

  const students = isSearchChanging ? [] : (query.data?.pages.flatMap((page) => page.items) ?? []);
  const total = query.data?.pages[0]?.total ?? 0;
  const hasData = Boolean(query.data) && !isSearchChanging;
  const isInitialError = query.isError && !hasData && !isSearchChanging;
  const isSearchEmpty = Boolean(appliedSearch) && hasData && total === 0;
  const isPortfolioEmpty = !appliedSearch && hasData && total === 0;
  const hasPaginationError = query.isFetchNextPageError && !isSearchChanging;
  const hasRefreshError = query.isRefetchError && !hasPaginationError && !isSearchChanging;
  const refreshing = query.isRefetching && !query.isFetchingNextPage && hasData;
  const subtitle = hasData
    ? appliedSearch
      ? `${total} alunos encontrados`
      : `${total} alunos vinculados`
    : 'Localize e abra alunos vinculados à sua conta.';

  const changeSearch = (value: string): void => {
    if (value.trim() !== appliedSearch) {
      void queryClient.cancelQueries({
        queryKey: ['trainer', 'students', appliedSearch],
        exact: true,
      });
    }
    setSearchInput(value);
    if (!value.trim()) setAppliedSearch('');
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

  return (
    <TrainerScreen
      onRefresh={refresh}
      refreshDisabled={query.isFetching || isSearchChanging}
      refreshing={refreshing}
      subtitle={subtitle}
      title="Alunos"
    >
      <KeyboardScrollView
        className="flex-1"
        contentContainerStyle={{ gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          autoCapitalize="words"
          kind="search"
          label="Buscar aluno"
          testID="trainer-students-search"
          onChangeText={changeSearch}
          placeholder="Nome do aluno"
          returnKeyType="search"
          value={searchInput}
          trailing={
            searchInput ? (
              <IconButton
                accessibilityLabel="Limpar busca"
                variant="text"
                icon={<X color={colors.secondary} size={20} />}
                onPress={() => changeSearch('')}
              />
            ) : null
          }
        />
        {query.isPending || isSearchChanging ? (
          <StatePanel
            description="Estamos carregando os alunos vinculados à sua conta."
            kind="loading"
            title="Carregando alunos"
          />
        ) : null}
        {isInitialError ? (
          <StatePanel
            description="Verifique sua conexão e atualize para tentar novamente."
            kind="error"
            title="Não foi possível carregar seus alunos"
          />
        ) : null}

        {isSearchEmpty ? (
          <StatePanel
            description="Tente outro nome ou limpe a busca."
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
          <ActionFeedback
            eventKey={query.errorUpdatedAt}
            title="Não foi possível atualizar a lista."
            variant="error"
          />
        ) : null}
        {hasPaginationError ? (
          <>
            <ActionFeedback
              eventKey={query.errorUpdatedAt}
              title="Não foi possível carregar mais alunos."
              variant="error"
            />
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

        {query.hasNextPage && !hasPaginationError && !isSearchChanging ? (
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
      </KeyboardScrollView>
    </TrainerScreen>
  );
}
