import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EXERCISE_CATALOG_PAGE_SIZE,
  type Exercise,
  type ExerciseCatalogPage,
  listExerciseCatalog,
} from '../../application/exercises/exercise-catalog';
import { colors, controlSizes, spacing } from '../../lib/design-system/tokens';
import { MUSCLE_GROUP_LABEL, type MuscleGroup, muscleGroupLabel } from '../../lib/muscle-groups';
import { useApiClient } from '../../lib/use-api';
import { ActionFeedback } from '../ui/v2/action-feedback';
import { Button } from '../ui/v2/button';
import { Card } from '../ui/v2/card';
import { Field } from '../ui/v2/field';
import { IconButton } from '../ui/v2/icon-button';
import { SheetSurface } from '../ui/v2/sheet-surface';
import { StatePanel } from '../ui/v2/state-panel';
import { Text } from '../ui/v2/text';
import { ToastProvider } from '../ui/v2/toast';

export type ExerciseCatalogModalProps = {
  visible: boolean;
  disabled?: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
};

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'cardio',
  'full_body',
];

export function ExerciseCatalogModal({
  disabled = false,
  onClose,
  onSelect,
  visible,
}: ExerciseCatalogModalProps): React.JSX.Element {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>();
  const search = draftSearch.trim();
  const isSearchChanging = search !== appliedSearch;

  useEffect(() => {
    if (!visible || !isSearchChanging) return;
    const timeout = setTimeout(() => setAppliedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [visible, isSearchChanging, search]);

  const query = useInfiniteQuery({
    enabled: visible && !isSearchChanging,
    queryKey: ['trainer', 'exercise-catalog', appliedSearch, muscleGroup ?? 'all'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      listExerciseCatalog(api, {
        q: appliedSearch,
        muscleGroup,
        limit: EXERCISE_CATALOG_PAGE_SIZE,
        offset: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage: ExerciseCatalogPage, pages: ExerciseCatalogPage[]) => {
      const loaded = pages.reduce((total, page) => total + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const isBusy = disabled || query.isFetching || isSearchChanging;
  const items = isSearchChanging ? [] : (query.data?.pages.flatMap((page) => page.items) ?? []);
  const hasData = Boolean(query.data) && !isSearchChanging;
  const isInitialError = query.isError && !hasData && !isSearchChanging;
  const hasPaginationError = query.isFetchNextPageError && !isSearchChanging;
  const hasRefreshError = query.isRefetchError && !hasPaginationError && !isSearchChanging;
  const isEmpty = hasData && items.length === 0;

  function changeSearch(value: string): void {
    if (disabled) return;
    if (value.trim() !== appliedSearch) {
      void queryClient.cancelQueries({
        queryKey: ['trainer', 'exercise-catalog', appliedSearch, muscleGroup ?? 'all'],
        exact: true,
      });
    }
    setDraftSearch(value);
    if (!value.trim()) setAppliedSearch('');
  }

  function selectMuscleGroup(nextGroup: MuscleGroup | undefined): void {
    if (isBusy) return;
    setMuscleGroup(nextGroup);
  }

  function selectExercise(exercise: Exercise): void {
    if (isBusy) return;
    onSelect(exercise);
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      {visible ? (
        <ToastProvider modal safeAreaView={SafeAreaView}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 justify-end"
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute inset-0"
              style={{ backgroundColor: colors.scrim }}
            />
            <SheetSurface
              className="mx-4 gap-4 p-4"
              style={{
                height: '92%',
                maxHeight: '92%',
                paddingBottom: Math.max(insets.bottom, spacing.xxl),
              }}
              testID="exercise-catalog-sheet"
            >
              <View className="shrink-0 gap-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    variant="sectionTitle"
                    className="min-w-0 flex-1 text-[22px] leading-[30.8px]"
                  >
                    Adicionar exercício
                  </Text>
                  <IconButton
                    accessibilityLabel="Fechar catálogo"
                    icon={<X accessible={false} color={colors.brand} size={22} />}
                    onPress={onClose}
                  />
                </View>

                <Field
                  editable={!disabled}
                  kind="search"
                  label="Buscar exercício"
                  onChangeText={changeSearch}
                  placeholder="Nome do exercício"
                  value={draftSearch}
                  trailing={
                    draftSearch ? (
                      <IconButton
                        accessibilityLabel="Limpar busca"
                        disabled={disabled}
                        icon={<X accessible={false} color={colors.secondary} size={20} />}
                        onPress={() => changeSearch('')}
                        variant="text"
                      />
                    ) : null
                  }
                />
              </View>

              <ScrollView
                horizontal
                style={{ flexGrow: 0, flexShrink: 0 }}
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
              >
                <View className="flex-row gap-2">
                  <MuscleGroupFilter
                    disabled={isBusy}
                    label="Todos"
                    onPress={() => selectMuscleGroup(undefined)}
                    selected={!muscleGroup}
                  />
                  {MUSCLE_GROUPS.map((group) => (
                    <MuscleGroupFilter
                      disabled={isBusy}
                      key={group}
                      label={MUSCLE_GROUP_LABEL[group]}
                      onPress={() => selectMuscleGroup(group)}
                      selected={muscleGroup === group}
                    />
                  ))}
                </View>
              </ScrollView>

              <ScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
              >
                {query.isPending || isSearchChanging ? (
                  <StatePanel
                    description="Estamos buscando exercícios disponíveis para sua conta."
                    kind="loading"
                    title="Carregando exercícios"
                  />
                ) : null}

                {isInitialError ? (
                  <StatePanel
                    action={{
                      label: 'Tentar novamente',
                      onPress: () => void query.refetch(),
                      disabled: isBusy,
                    }}
                    description="Verifique sua conexão e tente novamente."
                    kind="error"
                    title="Não foi possível carregar os exercícios"
                  />
                ) : null}

                {isEmpty ? (
                  <StatePanel
                    description="Tente outro nome ou grupo muscular."
                    kind="empty"
                    title="Nenhum exercício encontrado"
                  />
                ) : null}

                {items.map((exercise) => (
                  <Card
                    className="gap-2 border-0"
                    action={{
                      label: `Selecionar ${exercise.name}, ${muscleGroupLabel(exercise.muscleGroup)}`,
                      onPress: () => selectExercise(exercise),
                      disabled: isBusy,
                    }}
                    key={exercise.id}
                  >
                    <Text variant="label" className="text-[19px] leading-[26.6px]">
                      {exercise.name}
                    </Text>
                    <Text className="text-v2-secondary" variant="body">
                      {muscleGroupLabel(exercise.muscleGroup)}
                    </Text>
                    {exercise.equipment ? (
                      <Text className="text-v2-secondary" variant="body">
                        {exercise.equipment}
                      </Text>
                    ) : null}
                  </Card>
                ))}

                {hasRefreshError ? (
                  <ActionFeedback
                    eventKey={query.errorUpdatedAt}
                    title="Não foi possível atualizar os exercícios."
                    variant="error"
                  />
                ) : null}

                {hasPaginationError ? (
                  <>
                    <ActionFeedback
                      eventKey={query.errorUpdatedAt}
                      title="Não foi possível carregar mais exercícios."
                      variant="error"
                    />
                    <Button
                      disabled={isBusy}
                      label="Tentar carregar mais"
                      loading={query.isFetchingNextPage}
                      onPress={() => void query.fetchNextPage()}
                      variant="secondary"
                    />
                  </>
                ) : null}

                {query.hasNextPage && !hasPaginationError && !isSearchChanging ? (
                  <Button
                    disabled={isBusy}
                    label="Carregar mais"
                    loading={query.isFetchingNextPage}
                    onPress={() => void query.fetchNextPage()}
                    variant="secondary"
                  />
                ) : null}
              </ScrollView>
            </SheetSurface>
          </KeyboardAvoidingView>
        </ToastProvider>
      ) : null}
    </Modal>
  );
}

function MuscleGroupFilter({
  disabled,
  label,
  onPress,
  selected,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      className={`min-w-[104px] items-center justify-center rounded-v2-field border px-4 py-3 ${
        selected ? 'border-v2-brand bg-v2-subtle' : 'border-v2-border bg-v2-surface'
      } ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: controlSizes.touch }}
    >
      <Text className="text-v2-brand" variant="label">
        {label}
      </Text>
    </Pressable>
  );
}
