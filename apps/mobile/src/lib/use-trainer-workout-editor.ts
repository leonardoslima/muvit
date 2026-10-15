import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTrainerWorkoutPlan,
  getTrainerWorkoutDraft,
  getTrainerWorkoutPlan,
  publishTrainerWorkoutDraft,
  saveTrainerWorkoutDraft,
  trainerWorkoutDraftQueryKey,
  updateTrainerWorkoutPlan,
} from '../application/workouts/trainer-workout-data';
import type {
  TrainerWorkoutPlan,
  TrainerWorkoutPlanDraft,
} from '../application/workouts/trainer-workout-data';
import {
  addWorkoutEditorDay,
  addWorkoutEditorExercise,
  buildCreateTrainerWorkoutInput,
  buildUpdateTrainerWorkoutInput,
  buildWorkoutDraftPayload,
  createEmptyWorkoutEditorState,
  hydrateWorkoutEditorState,
  moveWorkoutEditorExercise,
  removeWorkoutEditorDay,
  removeWorkoutEditorExercise,
  updateWorkoutEditorDayLabel,
  updateWorkoutEditorExerciseField,
  updateWorkoutEditorPlanField,
} from '../application/workouts/workout-editor';
import type {
  WorkoutEditorDay,
  WorkoutEditorExercise,
  WorkoutEditorExerciseReference,
  WorkoutEditorState,
} from '../application/workouts/workout-editor';
import {
  getWorkoutEditorSnapshot,
  hydrateWorkoutDraftEditorState,
  isWorkoutEditorDirty,
} from '../application/workouts/workout-editor-draft';
import type { ApiRequester } from './api';
import { ApiError } from './api';

export type UseTrainerWorkoutEditorInput = {
  api: ApiRequester;
  authUserId: string;
  studentId: string;
  planId?: string;
  draftId?: string;
  mode: 'create' | 'edit';
};

export type TrainerWorkoutEditorFeedback = {
  tone: 'error' | 'success';
  message: string;
};

export type TrainerWorkoutEditorController = {
  editor: WorkoutEditorState;
  activeDayId?: string;
  activeDay?: WorkoutEditorDay;
  dirtyExerciseIds: string[];
  focusedExerciseId?: string;
  plan?: TrainerWorkoutPlan;
  draft?: TrainerWorkoutPlanDraft;
  dirty: boolean;
  busy: boolean;
  loading: boolean;
  refreshing: boolean;
  draftRecovered: boolean;
  contextError?: string;
  loadError?: unknown;
  feedback?: TrainerWorkoutEditorFeedback;
  updateEditor: (update: (current: WorkoutEditorState) => WorkoutEditorState) => void;
  setActiveDay: (dayId: string) => void;
  setFocusedExercise: (exerciseId?: string) => void;
  addDay: () => void;
  addExercise: (exercise: WorkoutEditorExerciseReference) => void;
  removeDay: (dayId: string) => void;
  removeExercise: (dayId: string, exerciseId: string) => void;
  moveExercise: (dayId: string, exerciseId: string, direction: -1 | 1) => void;
  changeDayLabel: (dayId: string, value: string) => void;
  changeExerciseField: (
    dayId: string,
    exerciseId: string,
    field: 'sets' | 'reps' | 'loadKg' | 'restSeconds' | 'notes',
    value: string,
  ) => void;
  changePlanField: (field: 'name' | 'notes', value: string) => void;
  discardChanges: () => void;
  saveDraft: () => Promise<boolean>;
  publish: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

export function useTrainerWorkoutEditor({
  api,
  authUserId,
  studentId,
  planId,
  draftId,
  mode,
}: UseTrainerWorkoutEditorInput): TrainerWorkoutEditorController {
  const queryClient = useQueryClient();
  const localIdCounter = useRef(0);
  const createLocalId = useCallback(() => {
    localIdCounter.current += 1;
    return `workout-local-${localIdCounter.current}`;
  }, []);
  const [editor, setEditor] = useState(() => createEmptyWorkoutEditorState(createLocalId));
  const editorRef = useRef(editor);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => getWorkoutEditorSnapshot(editor));
  const baselineSnapshotRef = useRef(baselineSnapshot);
  const baselineEditorRef = useRef(editor);
  const [activeDayId, setActiveDayId] = useState<string | undefined>(editor.days[0]?.localId);
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [feedback, setFeedback] = useState<TrainerWorkoutEditorFeedback | undefined>(undefined);
  const [savedDraft, setSavedDraft] = useState<TrainerWorkoutPlanDraft | undefined>(undefined);
  const [draftConsumed, setDraftConsumed] = useState(false);
  const [publishedPlan, setPublishedPlan] = useState<TrainerWorkoutPlan | undefined>(undefined);
  const hydratedDraftRef = useRef<TrainerWorkoutPlanDraft | undefined>(undefined);
  const hydratedDraftRevision = useRef<number | undefined>(undefined);

  const draftQueryKey = [
    ...trainerWorkoutDraftQueryKey(authUserId, studentId),
    draftId ?? 'new',
  ] as const;
  const draftQuery = useQuery({
    enabled: Boolean(studentId && draftId && !draftConsumed),
    queryKey: draftQueryKey,
    queryFn: ({ signal }) => {
      if (!draftId) throw new Error('Rascunho inválido.');
      return getTrainerWorkoutDraft(api, draftId, signal);
    },
  });
  const draftSourcePlanId =
    draftId && !draftConsumed ? (draftQuery.data?.sourcePlanId ?? undefined) : undefined;
  const contextPlanId = draftId
    ? draftConsumed
      ? (publishedPlan?.id ?? undefined)
      : draftSourcePlanId
    : (publishedPlan?.id ?? planId);
  const planQuery = useQuery({
    enabled: Boolean(studentId && contextPlanId && (mode === 'edit' || draftId) && !draftConsumed),
    queryKey: ['trainer', 'workout', contextPlanId],
    queryFn: ({ signal }) => {
      if (!contextPlanId) throw new Error('Treino inválido.');
      return getTrainerWorkoutPlan(api, contextPlanId, signal);
    },
  });

  const plan = publishedPlan ?? planQuery.data;
  const dirty = isWorkoutEditorDirty(editor, baselineSnapshot);
  const draft = draftConsumed
    ? savedDraft
    : draftId
      ? (hydratedDraftRef.current ?? draftQuery.data)
      : savedDraft;
  const draftForContextValidation = draftId ? (draftQuery.data ?? draft) : draft;
  const invalidContext = !studentId || (mode === 'edit' && !draftId && !planId);
  let contextError: string | undefined;

  if (!studentId) {
    contextError = 'Não foi possível identificar o aluno solicitado.';
  } else if (mode === 'edit' && !draftId && !planId) {
    contextError = 'Não foi possível identificar o treino solicitado.';
  } else if (
    !draftConsumed &&
    draftQuery.error instanceof ApiError &&
    draftQuery.error.status === 404
  ) {
    contextError = 'Este rascunho não está disponível para sua conta.';
  } else if (draftForContextValidation && draftForContextValidation.studentId !== studentId) {
    contextError = 'Este rascunho não pertence ao aluno aberto neste contexto.';
  } else if (
    !publishedPlan &&
    planQuery.error instanceof ApiError &&
    planQuery.error.status === 404
  ) {
    contextError = 'Este treino não está disponível para sua conta.';
  } else if (plan && plan.studentId !== studentId) {
    contextError = 'Este treino não pertence ao aluno aberto neste contexto.';
  } else if (!publishedPlan && plan?.status === 'archived') {
    contextError = 'Planos arquivados são somente leitura no mobile.';
  }

  const loading =
    !publishedPlan &&
    !draftConsumed &&
    !invalidContext &&
    (draftId
      ? draftQuery.isPending || Boolean(draftSourcePlanId && planQuery.isPending)
      : mode === 'edit' && planQuery.isPending);
  const refreshing = draftQuery.isFetching || planQuery.isFetching;
  const loadError = publishedPlan
    ? undefined
    : draftId && draftQuery.isError
      ? draftQuery.error
      : planQuery.isError
        ? planQuery.error
        : undefined;
  const dirtyExerciseIds = getDirtyExerciseIds(editor, baselineEditorRef.current);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (contextError || dirtyRef.current) return;

    if (draftId && draftQuery.data) {
      if (draftQuery.data.sourcePlanId && !plan) return;
      if (hydratedDraftRevision.current === draftQuery.data.revision) return;
      try {
        const preserveInteraction = hydratedDraftRevision.current !== undefined;
        const selectedDayIndex = preserveInteraction
          ? getSelectedDayIndex(editorRef.current, activeDayId)
          : -1;
        const focusLocation = preserveInteraction
          ? getFocusedExerciseLocation(editorRef.current, focusedExerciseId)
          : undefined;
        const hydrated = hydrateWorkoutDraftEditorState(draftQuery.data, createLocalId);
        hydratedDraftRef.current = draftQuery.data;
        hydratedDraftRevision.current = draftQuery.data.revision;
        const selectedDay =
          hydrated.state.days[selectedDayIndex] ??
          hydrated.state.days.find((day) => day.localId === hydrated.selectedDayLocalId);
        const focusedExercise = findExerciseAtLocation(hydrated.state, focusLocation);
        editorRef.current = hydrated.state;
        baselineEditorRef.current = hydrated.state;
        baselineSnapshotRef.current = getWorkoutEditorSnapshot(hydrated.state);
        setEditor(hydrated.state);
        setBaselineSnapshot(baselineSnapshotRef.current);
        setActiveDayId(selectedDay?.localId);
        setFocusedExerciseId(focusedExercise?.localId);
      } catch {
        setFeedback({ tone: 'error', message: 'Não foi possível recuperar este rascunho.' });
      }
      return;
    }

    if (mode === 'edit' && plan) {
      const selectedDayIndex = getSelectedDayIndex(editorRef.current, activeDayId);
      const focusLocation = getFocusedExerciseLocation(editorRef.current, focusedExerciseId);
      const hydrated = hydrateWorkoutEditorState(plan, createLocalId);
      if (
        JSON.stringify(getWorkoutEditorSnapshot(hydrated)) ===
        JSON.stringify(baselineSnapshotRef.current)
      ) {
        return;
      }
      editorRef.current = hydrated;
      baselineEditorRef.current = hydrated;
      baselineSnapshotRef.current = getWorkoutEditorSnapshot(hydrated);
      setEditor(hydrated);
      setBaselineSnapshot(baselineSnapshotRef.current);
      setActiveDayId(hydrated.days[selectedDayIndex]?.localId ?? hydrated.days[0]?.localId);
      setFocusedExerciseId(findExerciseAtLocation(hydrated, focusLocation)?.localId);
    }
  }, [
    activeDayId,
    contextError,
    createLocalId,
    draftId,
    draftQuery.data,
    focusedExerciseId,
    mode,
    plan,
  ]);

  const activeDay = editor.days.find((day) => day.localId === activeDayId) ?? editor.days[0];

  const updateEditor = useCallback(
    (update: (current: WorkoutEditorState) => WorkoutEditorState) => {
      if (busyRef.current) return;
      const next = update(editorRef.current);
      if (next === editorRef.current) return;
      editorRef.current = next;
      setEditor(next);
      setFeedback(undefined);
    },
    [],
  );

  const setActiveDay = useCallback((dayId: string) => {
    if (busyRef.current || !editorRef.current.days.some((day) => day.localId === dayId)) return;
    setActiveDayId(dayId);
  }, []);

  const addDay = useCallback(() => {
    if (busyRef.current) return;
    const next = addWorkoutEditorDay(editorRef.current, createLocalId);
    if (next === editorRef.current) return;
    editorRef.current = next;
    setEditor(next);
    setActiveDayId(next.days.at(-1)?.localId);
    setFeedback(undefined);
  }, [createLocalId]);

  const addExercise = useCallback(
    (exercise: WorkoutEditorExerciseReference) => {
      if (busyRef.current || !activeDayId) return;
      updateEditor((current) =>
        addWorkoutEditorExercise(current, activeDayId, exercise, createLocalId),
      );
    },
    [activeDayId, createLocalId, updateEditor],
  );

  const removeDay = useCallback(
    (dayId: string) => {
      if (busyRef.current || editorRef.current.days.length <= 1) return;
      const next = removeWorkoutEditorDay(editorRef.current, dayId);
      if (next === editorRef.current) return;
      editorRef.current = next;
      setEditor(next);
      if (activeDayId === dayId) setActiveDayId(next.days[0]?.localId);
      setFeedback(undefined);
    },
    [activeDayId],
  );

  const removeExercise = useCallback(
    (dayId: string, exerciseId: string) => {
      updateEditor((current) => removeWorkoutEditorExercise(current, dayId, exerciseId));
      if (focusedExerciseId === exerciseId) setFocusedExerciseId(undefined);
    },
    [focusedExerciseId, updateEditor],
  );

  const moveExercise = useCallback(
    (dayId: string, exerciseId: string, direction: -1 | 1) => {
      updateEditor((current) => moveWorkoutEditorExercise(current, dayId, exerciseId, direction));
    },
    [updateEditor],
  );

  const changeDayLabel = useCallback(
    (dayId: string, value: string) => {
      updateEditor((current) => updateWorkoutEditorDayLabel(current, dayId, value));
    },
    [updateEditor],
  );

  const changeExerciseField = useCallback(
    (
      dayId: string,
      exerciseId: string,
      field: 'sets' | 'reps' | 'loadKg' | 'restSeconds' | 'notes',
      value: string,
    ) => {
      updateEditor((current) =>
        updateWorkoutEditorExerciseField(current, dayId, exerciseId, field, value),
      );
    },
    [updateEditor],
  );

  const changePlanField = useCallback(
    (field: 'name' | 'notes', value: string) => {
      updateEditor((current) => updateWorkoutEditorPlanField(current, field, value));
    },
    [updateEditor],
  );

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    const current = editorRef.current;
    const result = buildWorkoutDraftPayload(current);
    if (!result.ok) {
      setFeedback({ tone: 'error', message: result.message });
      return false;
    }
    if (!isWorkoutEditorDirty(current, baselineSnapshotRef.current)) return true;

    const selectedDayIndex = current.days.findIndex((day) => day.localId === activeDayId);
    const selectedDayOrder = result.body.days[selectedDayIndex]?.dayOrder;
    if (selectedDayOrder === undefined) {
      setFeedback({ tone: 'error', message: 'Selecione um dia válido para salvar o rascunho.' });
      return false;
    }

    busyRef.current = true;
    setBusy(true);
    setFeedback(undefined);
    try {
      const draftToUpdate = draftId && !draftConsumed ? draft : savedDraft;
      if (draftId && !draftConsumed && !draftToUpdate) {
        setFeedback({ tone: 'error', message: 'Não foi possível confirmar este rascunho.' });
        return false;
      }
      const sourcePlanId =
        publishedPlan?.id ?? draftToUpdate?.sourcePlanId ?? (mode === 'edit' ? planId : undefined);
      const saved = await saveTrainerWorkoutDraft(api, {
        studentId,
        ...(sourcePlanId ? { sourcePlanId } : {}),
        ...(draftToUpdate ? { draftId: draftToUpdate.id, revision: draftToUpdate.revision } : {}),
        payload: result.body,
        selectedDayOrder,
      });
      setSavedDraft(saved);
      if (draftId && !draftConsumed) queryClient.setQueryData(draftQueryKey, saved);
      hydratedDraftRef.current = saved;
      hydratedDraftRevision.current = saved.revision;
      baselineEditorRef.current = current;
      baselineSnapshotRef.current = getWorkoutEditorSnapshot(current);
      setBaselineSnapshot(baselineSnapshotRef.current);
      setFeedback({ tone: 'success', message: 'Rascunho salvo na sua conta.' });
      await invalidateWorkoutQueries(queryClient, authUserId, studentId);
      return true;
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível salvar o rascunho.' });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [
    activeDayId,
    api,
    authUserId,
    draft,
    draftConsumed,
    draftId,
    draftQueryKey,
    mode,
    planId,
    publishedPlan,
    queryClient,
    savedDraft,
    studentId,
  ]);

  const publish = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    const current = editorRef.current;
    const draftPayload = buildWorkoutDraftPayload(current);
    if (!draftPayload.ok) {
      setFeedback({ tone: 'error', message: draftPayload.message });
      return false;
    }
    const hasUnpublishedDraft = Boolean(draftId && !draftConsumed);
    if (!isWorkoutEditorDirty(current, baselineSnapshotRef.current) && !hasUnpublishedDraft) {
      return true;
    }

    busyRef.current = true;
    setBusy(true);
    setFeedback(undefined);
    try {
      let published: TrainerWorkoutPlan;
      if (draftId && !draftConsumed) {
        const currentDraft = draft;
        if (!currentDraft) {
          setFeedback({ tone: 'error', message: 'Não foi possível confirmar este rascunho.' });
          return false;
        }
        published = await publishTrainerWorkoutDraft(api, draftId, {
          payload: draftPayload.body,
          revision: currentDraft.revision,
        });
      } else if (publishedPlan || (mode === 'edit' && planId)) {
        const updateResult = buildUpdateTrainerWorkoutInput(current);
        if (!updateResult.ok) {
          setFeedback({ tone: 'error', message: updateResult.message });
          return false;
        }
        const activePlanId = publishedPlan?.id ?? planId;
        if (!activePlanId) return false;
        published = await updateTrainerWorkoutPlan(api, activePlanId, updateResult.body);
      } else {
        const createResult = buildCreateTrainerWorkoutInput(current, studentId);
        if (!createResult.ok) {
          setFeedback({ tone: 'error', message: createResult.message });
          return false;
        }
        published = await createTrainerWorkoutPlan(api, createResult.body);
      }

      setPublishedPlan(published);
      queryClient.setQueryData(['trainer', 'workout', published.id], published);
      if (draftId && !draftConsumed) {
        setDraftConsumed(true);
        hydratedDraftRef.current = undefined;
        hydratedDraftRevision.current = undefined;
        queryClient.removeQueries({ queryKey: draftQueryKey, exact: true });
      }
      baselineEditorRef.current = current;
      baselineSnapshotRef.current = getWorkoutEditorSnapshot(current);
      setBaselineSnapshot(baselineSnapshotRef.current);
      setSavedDraft(undefined);
      setFeedback({ tone: 'success', message: 'Treino publicado com sucesso.' });
      await invalidateWorkoutQueries(queryClient, authUserId, studentId, published.id);
      return true;
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível publicar o treino.' });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [
    api,
    authUserId,
    draft,
    draftConsumed,
    draftId,
    draftQueryKey,
    mode,
    planId,
    publishedPlan,
    queryClient,
    studentId,
  ]);

  const discardChanges = useCallback(() => {
    if (busyRef.current) return;
    const selectedDayIndex = getSelectedDayIndex(editorRef.current, activeDayId);
    let restored = baselineEditorRef.current;
    if (draftId && draftQuery.data && hydratedDraftRevision.current !== draftQuery.data.revision) {
      const latestDraft = hydrateWorkoutDraftEditorState(draftQuery.data, createLocalId);
      restored = latestDraft.state;
      hydratedDraftRef.current = draftQuery.data;
      hydratedDraftRevision.current = draftQuery.data.revision;
      baselineEditorRef.current = restored;
      baselineSnapshotRef.current = getWorkoutEditorSnapshot(restored);
      setBaselineSnapshot(baselineSnapshotRef.current);
    }
    const selectedDay = restored.days[selectedDayIndex] ?? restored.days[0];
    const focusedExerciseStillExists = restored.days.some((day) =>
      day.exercises.some((exercise) => exercise.localId === focusedExerciseId),
    );
    editorRef.current = restored;
    setEditor(restored);
    setActiveDayId(selectedDay?.localId);
    setFocusedExerciseId(focusedExerciseStillExists ? focusedExerciseId : undefined);
    setFeedback(undefined);
  }, [activeDayId, createLocalId, draftId, draftQuery.data, focusedExerciseId]);

  const refresh = useCallback(async () => {
    if (busyRef.current || dirtyRef.current) return;
    const queries = [];
    if (draftId && !draftConsumed) queries.push(draftQuery.refetch());
    if (contextPlanId && !draftConsumed) queries.push(planQuery.refetch());
    await Promise.allSettled(queries);
  }, [contextPlanId, draftConsumed, draftId, draftQuery.refetch, planQuery.refetch]);

  return {
    editor,
    activeDayId,
    activeDay,
    dirtyExerciseIds,
    focusedExerciseId,
    plan,
    draft,
    dirty,
    busy,
    loading,
    refreshing,
    draftRecovered: Boolean(draftId && !draftConsumed && draft),
    contextError,
    loadError,
    feedback,
    updateEditor,
    setActiveDay,
    setFocusedExercise: (exerciseId) => {
      if (!busyRef.current) setFocusedExerciseId(exerciseId);
    },
    addDay,
    addExercise,
    removeDay,
    removeExercise,
    moveExercise,
    changeDayLabel,
    changeExerciseField,
    changePlanField,
    discardChanges,
    saveDraft,
    publish,
    refresh,
  };
}

async function invalidateWorkoutQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  authUserId: string,
  studentId: string,
  planId?: string,
): Promise<void> {
  const queryKeys = [
    ['trainer', 'workouts', studentId],
    ['trainer', 'summary'],
    trainerWorkoutDraftQueryKey(authUserId, studentId),
    ...(planId ? [['trainer', 'workout', planId]] : []),
  ];
  await Promise.allSettled(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey, refetchType: 'none' })),
  );
}

function getDirtyExerciseIds(editor: WorkoutEditorState, baseline: WorkoutEditorState): string[] {
  const baselineLocations = new Map<
    string,
    { dayIndex: number; exerciseIndex: number; exercise: WorkoutEditorExercise }
  >();
  baseline.days.forEach((day, dayIndex) => {
    day.exercises.forEach((exercise, exerciseIndex) => {
      baselineLocations.set(exercise.localId, { dayIndex, exerciseIndex, exercise });
    });
  });

  const dirtyIds: string[] = [];
  editor.days.forEach((day, dayIndex) => {
    day.exercises.forEach((exercise, exerciseIndex) => {
      const baselineLocation = baselineLocations.get(exercise.localId);
      if (
        !baselineLocation ||
        baselineLocation.dayIndex !== dayIndex ||
        baselineLocation.exerciseIndex !== exerciseIndex ||
        exerciseHasChanged(baselineLocation.exercise, exercise)
      ) {
        dirtyIds.push(exercise.localId);
      }
    });
  });
  return dirtyIds;
}

function exerciseHasChanged(
  baseline: WorkoutEditorExercise,
  current: WorkoutEditorExercise,
): boolean {
  const fields = [
    'exerciseId',
    'exerciseName',
    'muscleGroup',
    'sets',
    'reps',
    'loadKg',
    'restSeconds',
    'notes',
    'tempo',
  ] as const;
  return fields.some((field) => baseline[field] !== current[field]);
}

type ExerciseLocation = { dayIndex: number; exerciseIndex: number };

function getSelectedDayIndex(state: WorkoutEditorState, activeDayId?: string): number {
  const selectedIndex = state.days.findIndex((day) => day.localId === activeDayId);
  return selectedIndex < 0 ? 0 : selectedIndex;
}

function getFocusedExerciseLocation(
  state: WorkoutEditorState,
  focusedExerciseId?: string,
): ExerciseLocation | undefined {
  if (!focusedExerciseId) return undefined;
  for (const [dayIndex, day] of state.days.entries()) {
    const exerciseIndex = day.exercises.findIndex(
      (exercise) => exercise.localId === focusedExerciseId,
    );
    if (exerciseIndex >= 0) return { dayIndex, exerciseIndex };
  }
  return undefined;
}

function findExerciseAtLocation(
  state: WorkoutEditorState,
  location?: ExerciseLocation,
): WorkoutEditorExercise | undefined {
  if (!location) return undefined;
  return state.days[location.dayIndex]?.exercises[location.exerciseIndex];
}
