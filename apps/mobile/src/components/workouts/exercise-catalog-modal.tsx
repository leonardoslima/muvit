import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EXERCISE_CATALOG_PAGE_SIZE,
  type Exercise,
  type ExerciseCatalogPage,
  listExerciseCatalog,
} from '../../application/exercises/exercise-catalog';
import { colors, controlSizes, spacing } from '../../lib/design-system/tokens';
import { MUSCLE_GROUP_LABEL, type MuscleGroup, muscleGroupLabel } from '../../lib/muscle-groups';
import { useApiClient } from '../../lib/use-api';
import { Button } from '../ui/v2/button';
import { Card } from '../ui/v2/card';
import { Field } from '../ui/v2/field';
import { Message } from '../ui/v2/message';
import { SheetSurface } from '../ui/v2/sheet-surface';
import { StatePanel } from '../ui/v2/state-panel';
import { Text } from '../ui/v2/text';

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
  const insets = useSafeAreaInsets();
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>();
  const query = useInfiniteQuery({
    enabled: visible,
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

  const isBusy = disabled || query.isFetching;
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasData = Boolean(query.data);
  const isInitialError = query.isError && !hasData;
  const hasPaginationError = query.isFetchNextPageError;
  const hasRefreshError = query.isRefetchError && !hasPaginationError;
  const isEmpty = hasData && items.length === 0;

  function applySearch(): void {
    if (isBusy) return;
    setAppliedSearch(draftSearch.trim());
  }

  function clearSearch(): void {
    if (isBusy) return;
    setDraftSearch('');
    setAppliedSearch('');
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
      <KeyboardAvoidingView
        accessibilityViewIsModal
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
          className="gap-3"
          style={{ maxHeight: '92%', paddingBottom: Math.max(insets.bottom, spacing.xxl) }}
          testID="exercise-catalog-sheet"
        >
          <View className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text variant="sectionTitle" className="min-w-0 flex-1">
                Adicionar exercício
              </Text>
              <Button compact label="Fechar catálogo" onPress={onClose} variant="secondary" />
            </View>

            <Field
              editable={!isBusy}
              kind="search"
              label="Buscar exercício"
              onChangeText={setDraftSearch}
              onSubmitEditing={applySearch}
              placeholder="Nome do exercício"
              value={draftSearch}
            />
            <Button compact disabled={isBusy} label="Buscar" onPress={applySearch} />
            {draftSearch || appliedSearch ? (
              <Button
                compact
                disabled={isBusy}
                label="Limpar busca"
                onPress={clearSearch}
                variant="secondary"
              />
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
            className="shrink"
            contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
          >
            {query.isPending ? (
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
                action={{
                  label: `Selecionar ${exercise.name}, ${muscleGroupLabel(exercise.muscleGroup)}`,
                  onPress: () => selectExercise(exercise),
                  disabled: isBusy,
                }}
                key={exercise.id}
              >
                <Text variant="label">{exercise.name}</Text>
                <Text className="text-v2-secondary" variant="support">
                  {muscleGroupLabel(exercise.muscleGroup)}
                </Text>
                {exercise.equipment ? (
                  <Text className="text-v2-secondary" variant="support">
                    {exercise.equipment}
                  </Text>
                ) : null}
              </Card>
            ))}

            {hasRefreshError ? (
              <Message title="Não foi possível atualizar os exercícios." variant="error" />
            ) : null}

            {hasPaginationError ? (
              <>
                <Message title="Não foi possível carregar mais exercícios." variant="error" />
                <Button
                  compact
                  disabled={isBusy}
                  label="Tentar carregar mais"
                  loading={query.isFetchingNextPage}
                  onPress={() => void query.fetchNextPage()}
                  variant="secondary"
                />
              </>
            ) : null}

            {query.hasNextPage && !hasPaginationError ? (
              <Button
                compact
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
      className={`justify-center rounded-full border px-3 py-2 ${
        selected ? 'border-v2-brand bg-v2-subtle' : 'border-v2-border bg-v2-surface'
      } ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: controlSizes.touch }}
    >
      <Text className={selected ? 'text-v2-brand' : 'text-v2-secondary'} variant="support">
        {label}
      </Text>
    </Pressable>
  );
}
