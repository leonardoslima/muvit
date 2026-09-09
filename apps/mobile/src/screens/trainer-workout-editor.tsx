import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Exercise } from '../application/exercises/exercise-catalog';
import {
  type TrainerWorkoutPlan,
  createTrainerWorkoutPlan,
  getTrainerWorkoutPlan,
  updateTrainerWorkoutPlan,
} from '../application/workouts/trainer-workout-data';
import {
  type WorkoutEditorExerciseField,
  type WorkoutEditorState,
  addWorkoutEditorDay,
  addWorkoutEditorExercise,
  buildCreateTrainerWorkoutInput,
  buildUpdateTrainerWorkoutInput,
  createEmptyWorkoutEditorState,
  hydrateWorkoutEditorState,
  moveWorkoutEditorExercise,
  removeWorkoutEditorDay,
  removeWorkoutEditorExercise,
  updateWorkoutEditorDayLabel,
  updateWorkoutEditorExerciseField,
  updateWorkoutEditorPlanField,
} from '../application/workouts/workout-editor';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Field } from '../components/ui/field';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { ExerciseCatalogModal } from '../components/workouts/exercise-catalog-modal';
import { WorkoutEditorDayView } from '../components/workouts/workout-editor-day';
import { ApiError } from '../lib/api';
import { colors, controlSizes, radii, sharedStyles, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';
import { usePreventRemove } from '../lib/use-prevent-remove';

type NavigationAction = unknown;
type Navigation = {
  dispatch: (action: NavigationAction) => void;
};

export type TrainerWorkoutEditorScreenProps = {
  mode: 'create' | 'edit';
};

export function TrainerWorkoutEditorScreen({ mode }: TrainerWorkoutEditorScreenProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const navigation = useNavigation<Navigation>();
  const params = useLocalSearchParams<{
    studentId?: string | string[];
    planId?: string | string[];
  }>();
  const studentId = firstParam(params.studentId);
  const planId = firstParam(params.planId);

  const localIdCounter = useRef(0);
  const createLocalId = useCallback(() => {
    localIdCounter.current += 1;
    return `workout-local-${localIdCounter.current}`;
  }, []);
  const [editor, setEditor] = useState<WorkoutEditorState>(() =>
    createEmptyWorkoutEditorState(createLocalId),
  );
  const [activeDayId, setActiveDayId] = useState<string | undefined>(editor.days[0]?.localId);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [createdPlan, setCreatedPlan] = useState<TrainerWorkoutPlan | undefined>();
  const [editorDirty, setEditorDirty] = useState(false);
  const editorLocked = submitting || Boolean(createdPlan);

  const planQuery = useQuery({
    enabled: mode === 'edit' && Boolean(studentId && planId),
    queryKey: ['trainer', 'workout', planId],
    queryFn: ({ signal }) => {
      if (!planId) throw new Error('Treino inválido.');
      return getTrainerWorkoutPlan(api, planId, signal);
    },
  });

  useEffect(() => {
    if (
      mode !== 'edit' ||
      !planQuery.data ||
      planQuery.data.status === 'archived' ||
      planQuery.data.studentId !== studentId ||
      editorDirty
    ) {
      return;
    }

    const next = hydrateWorkoutEditorState(planQuery.data, createLocalId);
    setEditor(next);
    setActiveDayId(next.days[0]?.localId);
  }, [createLocalId, editorDirty, mode, planQuery.data, studentId]);

  function showDiscardConfirmation(onDiscard: () => void): void {
    Alert.alert('Descartar alterações?', 'As alterações deste treino serão perdidas.', [
      { text: 'Continuar editando', style: 'cancel' },
      {
        text: 'Descartar alterações',
        style: 'destructive',
        onPress: onDiscard,
      },
    ]);
  }

  usePreventRemove(editorDirty, ({ data }) => {
    if (submitting) return;

    showDiscardConfirmation(() => navigation.dispatch(data.action));
  });

  function clearFeedback(): void {
    setCreatedPlan(undefined);
    setSuccessMessage(undefined);
    setError(undefined);
  }

  function commitEditor(next: WorkoutEditorState): void {
    if (editorLocked) return;
    clearFeedback();
    if (next !== editor) {
      setEditorDirty(true);
    }
    setEditor(next);
  }

  function changeEditor(updater: (current: WorkoutEditorState) => WorkoutEditorState): void {
    if (editorLocked) return;
    commitEditor(updater(editor));
  }

  function dismissToWorkouts(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }
    router.dismissTo(`/trainer/students/${studentId}/workouts`);
  }

  function returnToWorkouts(): void {
    if (submitting) return;
    dismissToWorkouts();
  }

  function returnToDetail(): void {
    if (!studentId || !planId) {
      returnToWorkouts();
      return;
    }
    router.dismissTo(`/trainer/students/${studentId}/workouts/${planId}`);
  }

  function openCreatedPlan(): void {
    if (!studentId || !createdPlan) return;
    router.replace(`/trainer/students/${studentId}/workouts/${createdPlan.id}`);
  }

  function addDay(): void {
    if (editorLocked) return;
    const next = addWorkoutEditorDay(editor, createLocalId);
    if (next === editor) return;
    commitEditor(next);
    setActiveDayId(next.days[next.days.length - 1]?.localId);
  }

  function requestRemoveDay(dayId: string): void {
    const day = editor.days.find((item) => item.localId === dayId);
    if (!day || editor.days.length <= 1 || editorLocked) return;

    const remove = () => {
      const next = removeWorkoutEditorDay(editor, dayId);
      if (next === editor) return;
      commitEditor(next);
      if (activeDayId === dayId) {
        setActiveDayId(next.days[0]?.localId);
      }
    };

    if (day.exercises.length === 0) {
      remove();
      return;
    }

    Alert.alert(
      'Remover dia?',
      `O dia ${day.label} e seus exercícios serão removidos deste treino.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover dia', style: 'destructive', onPress: remove },
      ],
    );
  }

  function selectExercise(exercise: Exercise): void {
    if (!activeDayId || editorLocked) return;
    changeEditor((current) =>
      addWorkoutEditorExercise(
        current,
        activeDayId,
        {
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
        },
        createLocalId,
      ),
    );
    setCatalogOpen(false);
  }

  function submitButtonLabel(): string {
    if (mode === 'create') return submitting ? 'Salvando...' : 'Salvar treino';
    return submitting ? 'Salvando alterações...' : 'Salvar alterações';
  }

  async function submit(): Promise<void> {
    if (submitting || createdPlan || !studentId) return;

    if (mode === 'create') {
      const result = buildCreateTrainerWorkoutInput(editor, studentId);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSubmitting(true);
      setError(undefined);
      try {
        const created = await createTrainerWorkoutPlan(api, result.body);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['trainer', 'workouts', studentId] }),
          queryClient.invalidateQueries({ queryKey: ['trainer', 'summary'] }),
        ]);
        queryClient.setQueryData(['trainer', 'workout', created.id], created);
        setEditorDirty(false);
        setCreatedPlan(created);
        setSuccessMessage('Treino salvo com sucesso.');
      } catch {
        setError('Não foi possível salvar o treino.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!planId) return;
    const result = buildUpdateTrainerWorkoutInput(editor);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const updated = await updateTrainerWorkoutPlan(api, planId, result.body);
      queryClient.setQueryData(['trainer', 'workout', planId], updated);
      setEditorDirty(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trainer', 'workouts', studentId] }),
        queryClient.invalidateQueries({ queryKey: ['trainer', 'summary'] }),
      ]);
      setSuccessMessage('Treino atualizado com sucesso.');
    } catch {
      setError('Não foi possível atualizar o treino.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'create' && !studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para alunos"
          description="Não foi possível identificar o aluno solicitado."
          onAction={returnToWorkouts}
          title="Aluno inválido"
          tone="error"
        />
      </Screen>
    );
  }

  if (mode === 'edit' && (!studentId || !planId)) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Não foi possível identificar o treino solicitado."
          onAction={returnToWorkouts}
          title="Treino inválido"
          tone="error"
        />
      </Screen>
    );
  }

  if (mode === 'edit' && planQuery.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando a estrutura deste treino."
          title="Carregando treino"
          tone="loading"
        />
      </Screen>
    );
  }

  if (mode === 'edit' && planQuery.error instanceof ApiError && planQuery.error.status === 404) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não está disponível para sua conta."
          onAction={returnToWorkouts}
          title="Treino não encontrado"
          tone="error"
        />
      </Screen>
    );
  }

  if (mode === 'edit' && planQuery.isError && !planQuery.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionDisabled={planQuery.isFetching}
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void planQuery.refetch()}
          title="Não foi possível carregar o treino"
          tone="error"
        />
      </Screen>
    );
  }

  const plan = mode === 'edit' ? planQuery.data : undefined;
  if (mode === 'edit' && !plan) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não está disponível para sua conta."
          onAction={returnToWorkouts}
          title="Treino não encontrado"
          tone="error"
        />
      </Screen>
    );
  }

  if (plan && plan.studentId !== studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não pertence ao aluno aberto neste contexto."
          onAction={returnToWorkouts}
          title="Treino indisponível"
          tone="error"
        />
      </Screen>
    );
  }

  if (plan?.status === 'archived') {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treino"
          description="Planos arquivados são somente leitura no mobile."
          onAction={returnToDetail}
          title="Treino arquivado"
          tone="empty"
        />
      </Screen>
    );
  }

  const activeDay = editor.days.find((day) => day.localId === activeDayId) ?? editor.days[0];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton
        disabled={submitting}
        label="Voltar para treinos"
        onPress={returnToWorkouts}
        variant="secondary"
      />
      <ScreenHeader
        eyebrow={mode === 'create' ? 'Prescrição' : 'Editar prescrição'}
        subtitle="Monte a rotina com os exercícios e parâmetros de cada dia."
        title={mode === 'create' ? 'Novo treino' : 'Editar treino'}
      />

      <Card>
        <Field
          editable={!editorLocked}
          label="Nome do treino"
          onChangeText={(value) =>
            changeEditor((current) => updateWorkoutEditorPlanField(current, 'name', value))
          }
          value={editor.name}
        />
        <Field
          editable={!editorLocked}
          label="Notas"
          multiline
          onChangeText={(value) =>
            changeEditor((current) => updateWorkoutEditorPlanField(current, 'notes', value))
          }
          value={editor.notes}
        />

        <View style={styles.statusSection}>
          <Text style={sharedStyles.label}>Status</Text>
          <View style={styles.statusOptions}>
            {(['draft', 'active'] as const).map((status) => {
              const selected = editor.status === status;
              const label = status === 'draft' ? 'Rascunho' : 'Ativo';
              return (
                <Pressable
                  accessible
                  accessibilityLabel={label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: editorLocked, selected }}
                  disabled={editorLocked}
                  key={status}
                  onPress={() =>
                    changeEditor((current) =>
                      updateWorkoutEditorPlanField(current, 'status', status),
                    )
                  }
                  style={[styles.statusOption, selected ? styles.selectedStatus : null]}
                >
                  <Text style={styles.statusOptionText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <View style={styles.daysHeader}>
        <Text style={styles.sectionTitle}>Dias do treino</Text>
        <AppButton
          disabled={editorLocked || editor.days.length >= 7}
          label="Adicionar dia"
          onPress={addDay}
          variant="secondary"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.dayTabs}>
          {editor.days.map((day) => (
            <View key={day.localId} style={styles.dayTab}>
              <Pressable
                accessible
                accessibilityLabel={`Selecionar ${day.label}`}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: editorLocked,
                  selected: activeDayId === day.localId,
                }}
                disabled={editorLocked}
                onPress={() => setActiveDayId(day.localId)}
                style={[
                  styles.daySelector,
                  activeDayId === day.localId ? styles.selectedDay : null,
                ]}
              >
                <Text style={styles.daySelectorText}>{day.label}</Text>
              </Pressable>
              <AppButton
                disabled={editorLocked || editor.days.length <= 1}
                label={`Remover ${day.label}`}
                onPress={() => requestRemoveDay(day.localId)}
                variant="secondary"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {activeDay ? (
        <WorkoutEditorDayView
          day={activeDay}
          disabled={editorLocked}
          onAddExercise={() => {
            if (!editorLocked) setCatalogOpen(true);
          }}
          onChangeExercise={(exerciseLocalId, field, value) =>
            changeEditor((current) =>
              updateWorkoutEditorExerciseField(
                current,
                activeDay.localId,
                exerciseLocalId,
                field,
                value,
              ),
            )
          }
          onChangeLabel={(value) =>
            changeEditor((current) =>
              updateWorkoutEditorDayLabel(current, activeDay.localId, value),
            )
          }
          onMoveExercise={(exerciseLocalId, direction) =>
            changeEditor((current) =>
              moveWorkoutEditorExercise(current, activeDay.localId, exerciseLocalId, direction),
            )
          }
          onRemoveExercise={(exerciseLocalId) =>
            changeEditor((current) =>
              removeWorkoutEditorExercise(current, activeDay.localId, exerciseLocalId),
            )
          }
        />
      ) : null}

      {error ? <InlineMessage message={error} tone="error" /> : null}
      {successMessage ? <InlineMessage message={successMessage} tone="success" /> : null}
      <AppButton
        disabled={submitting || Boolean(createdPlan)}
        label={submitButtonLabel()}
        onPress={() => void submit()}
      />
      {createdPlan ? (
        <AppButton label="Ver treino" onPress={openCreatedPlan} variant="secondary" />
      ) : null}
      {mode === 'edit' && successMessage ? (
        <AppButton label="Voltar para treino" onPress={returnToDetail} variant="secondary" />
      ) : null}

      <ExerciseCatalogModal
        disabled={editorLocked}
        onClose={() => setCatalogOpen(false)}
        onSelect={selectExercise}
        visible={catalogOpen}
      />
    </Screen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  statusSection: {
    gap: spacing.sm,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusOption: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: controlSizes.touchTarget,
    paddingHorizontal: spacing.lg,
  },
  selectedStatus: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  statusOptionText: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
  daysHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  dayTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayTab: {
    gap: spacing.sm,
    minWidth: 144,
  },
  daySelector: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: controlSizes.touchTarget,
    paddingHorizontal: spacing.lg,
  },
  selectedDay: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  daySelectorText: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
});
