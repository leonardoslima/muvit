import { useIsFocused } from '@react-navigation/native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  type AppTabPressGuard,
  useRegisterAppTabPressGuard,
} from '../components/navigation/app-tabs';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import {
  ActionFeedback,
  Button,
  Card,
  Field,
  SectionTab,
  StatePanel,
  Text,
} from '../components/ui/v2';
import { KeyboardScrollView } from '../components/ui/v2/keyboard-scroll-view';
import { ExerciseCatalogModal } from '../components/workouts/exercise-catalog-modal';
import { WorkoutEditorDayView } from '../components/workouts/workout-editor-day';
import { WorkoutEditorExitSheet } from '../components/workouts/workout-editor-exit-sheet';
import { ApiError } from '../lib/api';
import { authClient } from '../lib/auth-client';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';
import { usePreventRemove } from '../lib/use-prevent-remove';
import { useTrainerWorkoutEditor } from '../lib/use-trainer-workout-editor';
import type { UseTrainerWorkoutEditorInput } from '../lib/use-trainer-workout-editor';

export type TrainerWorkoutEditorScreenProps = {
  mode: 'create' | 'edit';
};

type NavigationAction = unknown;
type Navigation = {
  dispatch: (action: NavigationAction) => void;
};

export function TrainerWorkoutEditorScreen({ mode }: TrainerWorkoutEditorScreenProps) {
  const api = useApiClient();
  const sessionState = authClient.useSession();
  const authUserId = sessionState.data?.user.id ?? '';
  const params = useLocalSearchParams<{
    studentId?: string | string[];
    planId?: string | string[];
    draftId?: string | string[];
  }>();
  const studentId = firstParam(params.studentId);
  const planId = firstParam(params.planId);
  const draftId = firstParam(params.draftId);
  const editorContextKey = JSON.stringify([authUserId, draftId, mode, planId, studentId]);

  return (
    <TrainerWorkoutEditorInstance
      key={editorContextKey}
      api={api}
      authUserId={authUserId}
      studentId={studentId ?? ''}
      mode={mode}
      {...(planId ? { planId } : {})}
      {...(draftId ? { draftId } : {})}
    />
  );
}

function TrainerWorkoutEditorInstance({
  api,
  authUserId,
  studentId,
  planId,
  draftId,
  mode,
}: UseTrainerWorkoutEditorInput) {
  const navigation = useNavigation<Navigation>();
  const isFocused = useIsFocused();
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const [exitVisible, setExitVisible] = useState(false);
  const [leaveAfterConfirmation, setLeaveAfterConfirmation] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const controller = useTrainerWorkoutEditor({
    api,
    authUserId,
    studentId: studentId ?? '',
    mode,
    ...(planId ? { planId } : {}),
    ...(draftId ? { draftId } : {}),
  });
  const activeDay = controller.activeDay;
  const hasUnsavedChanges = controller.dirty || controller.busy;
  const requestTabLeave = useCallback(
    (resumeNavigation: () => void) => {
      if (controller.busy) return;
      pendingNavigationRef.current = resumeNavigation;
      setExitVisible(true);
    },
    [controller.busy],
  );
  const tabPressGuard = useMemo<AppTabPressGuard>(
    () => ({
      busy: controller.busy,
      dirty: controller.dirty,
      requestLeave: requestTabLeave,
    }),
    [controller.busy, controller.dirty, requestTabLeave],
  );

  useRegisterAppTabPressGuard(tabPressGuard, isFocused);

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    if (controller.busy) return;
    pendingNavigationRef.current = () => navigation.dispatch(data.action);
    setExitVisible(true);
  });

  useEffect(() => {
    if (!leaveAfterConfirmation || controller.dirty || controller.busy) return;

    setExitVisible(false);
    setLeaveAfterConfirmation(false);
    const pendingNavigation = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    if (pendingNavigation) {
      pendingNavigation();
      return;
    }
    returnToPreviousScreen(studentId);
  }, [controller.busy, controller.dirty, leaveAfterConfirmation, studentId]);

  const hasRemoteContext = Boolean(planId || draftId || controller.plan?.id);
  const refreshDisabled =
    !studentId ||
    !hasRemoteContext ||
    controller.loading ||
    controller.refreshing ||
    controller.busy ||
    controller.dirty ||
    Boolean(controller.contextError);
  const unavailable = Boolean(controller.loadError && !controller.plan && !controller.draft);
  const archived = controller.contextError?.includes('arquivados') ?? false;
  const invalidStudent = !studentId;
  const contextTitle = invalidStudent
    ? 'Aluno inválido'
    : draftId
      ? 'Rascunho indisponível'
      : archived
        ? 'Treino arquivado'
        : controller.loadError instanceof ApiError && controller.loadError.status === 404
          ? 'Treino não encontrado'
          : 'Treino indisponível';

  const requestClose = () => {
    if (controller.busy) return;
    if (controller.dirty) {
      pendingNavigationRef.current = null;
      setExitVisible(true);
      return;
    }
    returnToPreviousScreen(studentId);
  };

  const continueEditing = () => {
    if (controller.busy) return;
    pendingNavigationRef.current = null;
    setExitVisible(false);
    setLeaveAfterConfirmation(false);
  };

  const saveAndExit = async () => {
    if (controller.busy) return;
    if (await controller.saveDraft()) setLeaveAfterConfirmation(true);
  };

  const discardAndExit = () => {
    if (controller.busy) return;
    controller.discardChanges();
    setLeaveAfterConfirmation(true);
  };

  const addDay = () => {
    if (controller.busy) return;
    controller.addDay();
  };

  const publish = async () => {
    if (controller.busy) return;
    await controller.publish();
  };

  return (
    <TrainerScreen
      backDisabled={controller.busy}
      backLabel="Voltar para treinos"
      contextual
      onBack={requestClose}
      onRefresh={() => void controller.refresh()}
      refreshDisabled={refreshDisabled}
      refreshing={controller.refreshing && !controller.loading}
      title={mode === 'create' ? 'Novo treino' : 'Editar treino'}
    >
      <KeyboardScrollView
        className="flex-1"
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {controller.contextError ? (
          <StatePanel
            action={{ label: 'Voltar para treinos', onPress: requestClose }}
            description={controller.contextError}
            kind={archived ? 'empty' : 'error'}
            title={contextTitle}
          />
        ) : controller.loading ? (
          <StatePanel
            description={
              draftId
                ? 'Estamos recuperando seu rascunho.'
                : 'Estamos carregando a estrutura deste treino.'
            }
            kind="loading"
            title={draftId ? 'Carregando rascunho' : 'Carregando treino'}
          />
        ) : unavailable ? (
          <StatePanel
            action={{
              label: 'Tentar novamente',
              onPress: () => void controller.refresh(),
              disabled: controller.refreshing,
            }}
            description="Verifique sua conexão e tente novamente."
            kind="error"
            title="Não foi possível carregar o treino"
          />
        ) : mode === 'edit' && !draftId && !controller.plan ? (
          <StatePanel
            action={{ label: 'Voltar para treinos', onPress: requestClose }}
            description="Este treino não está disponível para sua conta."
            kind="error"
            title="Treino não encontrado"
          />
        ) : !studentId ? (
          <StatePanel
            action={{ label: 'Voltar para alunos', onPress: requestClose }}
            description="Não foi possível identificar o aluno solicitado."
            kind="error"
            title="Aluno inválido"
          />
        ) : (
          <>
            {controller.draftRecovered ? (
              <ActionFeedback title="Rascunho recuperado da sua conta" variant="info" />
            ) : null}
            {controller.loadError ? (
              <ActionFeedback
                description="Os dados anteriores continuam disponíveis. Tente atualizar novamente."
                title="Não foi possível atualizar o treino"
                variant="error"
              />
            ) : null}
            {controller.feedback ? (
              <ActionFeedback
                description={controller.feedback.message}
                variant={controller.feedback.tone}
              />
            ) : null}

            <Card className="gap-4">
              <Field
                editable={!controller.busy}
                label="Nome do treino"
                onChangeText={(value) => controller.changePlanField('name', value)}
                value={controller.editor.name}
              />
              <Field
                editable={!controller.busy}
                label="Notas"
                multiline
                onChangeText={(value) => controller.changePlanField('notes', value)}
                value={controller.editor.notes}
              />
            </Card>

            <View className="flex-row flex-wrap items-center gap-3" testID="workout-days-header">
              <Text className="shrink-0" variant="sectionTitle">
                Dias do treino
              </Text>
              <Button
                className="ml-auto shrink-0"
                compact
                disabled={controller.busy || controller.editor.days.length >= 7}
                label="Adicionar dia"
                labelClassName="shrink-0"
                onPress={addDay}
                variant="secondary"
              />
            </View>

            <ScrollView
              horizontal
              contentContainerStyle={{ gap: spacing.sm }}
              showsHorizontalScrollIndicator={false}
            >
              {controller.editor.days.map((day) => (
                <SectionTab
                  accessibilityLabel={`Selecionar ${day.label}`}
                  key={day.localId}
                  label={day.label}
                  selected={day.localId === controller.activeDayId}
                  onPress={() => controller.setActiveDay(day.localId)}
                />
              ))}
            </ScrollView>

            {activeDay ? (
              <>
                <Text className="text-v2-secondary" variant="support">
                  {activeDay.exercises.length}{' '}
                  {activeDay.exercises.length === 1 ? 'exercício' : 'exercícios'}
                </Text>
                <WorkoutEditorDayView
                  canRemoveDay={controller.editor.days.length > 1}
                  day={activeDay}
                  disabled={controller.busy}
                  dirtyExerciseIds={controller.dirtyExerciseIds}
                  focusedExerciseId={controller.focusedExerciseId}
                  onAddExercise={() => setCatalogOpen(true)}
                  onChangeExercise={(exerciseId, field, value) =>
                    controller.changeExerciseField(activeDay.localId, exerciseId, field, value)
                  }
                  onChangeLabel={(value) => controller.changeDayLabel(activeDay.localId, value)}
                  onFocusExercise={(exerciseId) => controller.setFocusedExercise(exerciseId)}
                  onMoveExercise={(exerciseId, direction) =>
                    controller.moveExercise(activeDay.localId, exerciseId, direction)
                  }
                  onRemoveDay={() => controller.removeDay(activeDay.localId)}
                  onRemoveExercise={(exerciseId) =>
                    controller.removeExercise(activeDay.localId, exerciseId)
                  }
                />
              </>
            ) : null}

            <Button
              disabled={controller.busy}
              label={
                controller.busy
                  ? 'Publicando...'
                  : mode === 'create'
                    ? 'Salvar treino'
                    : 'Salvar alterações'
              }
              loading={controller.busy}
              onPress={() => void publish()}
            />
          </>
        )}
      </KeyboardScrollView>

      <ExerciseCatalogModal
        disabled={controller.busy}
        onClose={() => setCatalogOpen(false)}
        onSelect={(exercise) => {
          controller.addExercise({
            id: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
          });
          setCatalogOpen(false);
        }}
        visible={catalogOpen}
      />

      <WorkoutEditorExitSheet
        busy={controller.busy}
        error={controller.feedback?.tone === 'error' ? controller.feedback.message : undefined}
        onContinue={continueEditing}
        onDiscard={discardAndExit}
        onSave={() => void saveAndExit()}
        visible={exitVisible}
      />
    </TrainerScreen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function returnToPreviousScreen(studentId?: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  if (!studentId) {
    router.dismissTo('/trainer/students');
    return;
  }
  router.dismissTo(`/trainer/students/${studentId}/workouts`);
}
