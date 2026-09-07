import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  EXERCISE_CATALOG_PAGE_SIZE,
  type Exercise,
  type ExerciseCatalogPage,
  listExerciseCatalog,
} from '../../application/exercises/exercise-catalog';
import { MUSCLE_GROUP_LABEL, type MuscleGroup, muscleGroupLabel } from '../../lib/muscle-groups';
import { colors, radii, sharedStyles, spacing, typography } from '../../lib/styles';
import { useApiClient } from '../../lib/use-api';
import { AppButton } from '../ui/button';
import { Field } from '../ui/field';
import { InlineMessage } from '../ui/inline-message';
import { StatePanel } from '../ui/state-panel';

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
}: ExerciseCatalogModalProps) {
  const api = useApiClient();
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
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Adicionar exercício</Text>
            <AppButton label="Fechar catálogo" onPress={onClose} variant="secondary" />
          </View>

          <Field
            editable={!isBusy}
            label="Buscar exercício"
            onChangeText={setDraftSearch}
            onSubmitEditing={applySearch}
            placeholder="Nome do exercício"
            returnKeyType="search"
            value={draftSearch}
          />
          <AppButton disabled={isBusy} label="Buscar" onPress={applySearch} />
          {draftSearch || appliedSearch ? (
            <AppButton
              disabled={isBusy}
              label="Limpar busca"
              onPress={clearSearch}
              variant="secondary"
            />
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filters}>
              <Pressable
                accessible
                accessibilityLabel="Todos"
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy, selected: !muscleGroup }}
                disabled={isBusy}
                onPress={() => selectMuscleGroup(undefined)}
                style={[
                  styles.filter,
                  !muscleGroup ? styles.selectedFilter : null,
                  isBusy ? styles.disabled : null,
                ]}
              >
                <Text style={styles.filterText}>Todos</Text>
              </Pressable>
              {MUSCLE_GROUPS.map((group) => {
                const selected = muscleGroup === group;
                return (
                  <Pressable
                    accessible
                    accessibilityLabel={MUSCLE_GROUP_LABEL[group]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isBusy, selected }}
                    disabled={isBusy}
                    key={group}
                    onPress={() => selectMuscleGroup(group)}
                    style={[
                      styles.filter,
                      selected ? styles.selectedFilter : null,
                      isBusy ? styles.disabled : null,
                    ]}
                  >
                    <Text style={styles.filterText}>{MUSCLE_GROUP_LABEL[group]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <ScrollView contentContainerStyle={styles.list}>
            {query.isPending ? (
              <StatePanel
                description="Estamos buscando exercícios disponíveis para sua conta."
                title="Carregando exercícios"
                tone="loading"
              />
            ) : null}

            {isInitialError ? (
              <StatePanel
                actionDisabled={isBusy}
                actionLabel="Tentar novamente"
                description="Verifique sua conexão e tente novamente."
                onAction={() => void query.refetch()}
                title="Não foi possível carregar os exercícios"
                tone="error"
              />
            ) : null}

            {isEmpty ? (
              <StatePanel
                description="Tente outro nome ou grupo muscular."
                title="Nenhum exercício encontrado"
                tone="empty"
              />
            ) : null}

            {items.map((exercise) => (
              <Pressable
                accessible
                accessibilityLabel={`Selecionar ${exercise.name}, ${muscleGroupLabel(exercise.muscleGroup)}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy }}
                disabled={isBusy}
                key={exercise.id}
                onPress={() => selectExercise(exercise)}
                style={styles.exercise}
              >
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={sharedStyles.subtitle}>{muscleGroupLabel(exercise.muscleGroup)}</Text>
                {exercise.equipment ? (
                  <Text style={sharedStyles.subtitle}>{exercise.equipment}</Text>
                ) : null}
              </Pressable>
            ))}

            {hasRefreshError ? (
              <InlineMessage message="Não foi possível atualizar os exercícios." tone="error" />
            ) : null}

            {hasPaginationError ? (
              <>
                <InlineMessage message="Não foi possível carregar mais exercícios." tone="error" />
                <AppButton
                  disabled={isBusy}
                  label={query.isFetchingNextPage ? 'Carregando mais...' : 'Tentar carregar mais'}
                  onPress={() => void query.fetchNextPage()}
                  variant="secondary"
                />
              </>
            ) : null}

            {query.hasNextPage && !hasPaginationError ? (
              <AppButton
                disabled={isBusy}
                label={query.isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais'}
                onPress={() => void query.fetchNextPage()}
                variant="secondary"
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    gap: spacing.md,
    maxHeight: '92%',
    padding: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.ink,
    flex: 1,
    ...typography.sheetTitle,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filter: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedFilter: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.ink,
    ...typography.labelCompact,
  },
  disabled: {
    opacity: 0.5,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  exercise: {
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  exerciseName: {
    color: colors.ink,
    ...typography.cardTitle,
  },
});
