import type { WorkoutPlanDraft } from '@muvit/validators';
import type { WorkoutEditorState } from './workout-editor';

export type HydratedWorkoutDraftEditorState = {
  state: WorkoutEditorState;
  selectedDayOrder: number;
  selectedDayLocalId: string;
};

export type WorkoutEditorSnapshot = {
  name: string;
  notes: string;
  days: Array<{
    label: string;
    exercises: Array<{
      exerciseId: string;
      sets: string;
      reps: string;
      restSeconds: string;
      loadKg: string;
      notes: string;
      tempo?: string;
    }>;
  }>;
};

export function hydrateWorkoutDraftEditorState(
  draft: WorkoutPlanDraft,
  createId: () => string,
): HydratedWorkoutDraftEditorState {
  const exerciseReferences = new Map(
    draft.exerciseReferences.map((reference) => [reference.id, reference]),
  );
  const draftDays = draft.payload.days;
  const days = draftDays.map((day) => ({
    localId: createId(),
    label: day.label,
    exercises: day.exercises.map((exercise) => {
      const reference = exerciseReferences.get(exercise.exerciseId);
      if (!reference) throw new Error('O rascunho contém um exercício sem referência do catálogo.');

      return {
        localId: createId(),
        exerciseId: exercise.exerciseId,
        exerciseName: reference.name,
        muscleGroup: reference.muscleGroup,
        sets: String(exercise.sets),
        reps: exercise.reps,
        restSeconds: exercise.restSeconds === undefined ? '' : String(exercise.restSeconds),
        loadKg: exercise.loadKg === undefined ? '' : String(Math.round(exercise.loadKg)),
        notes: exercise.notes ?? '',
        tempo: exercise.tempo,
      };
    }),
  }));

  const selectedDayIndex = draftDays.findIndex((day) => day.dayOrder === draft.selectedDayOrder);
  const selectedDay = days[selectedDayIndex];
  if (!selectedDay) throw new Error('O dia selecionado não existe no rascunho.');

  return {
    state: {
      name: draft.payload.name,
      notes: draft.payload.notes ?? '',
      status: 'active',
      days,
    },
    selectedDayOrder: draft.selectedDayOrder,
    selectedDayLocalId: selectedDay.localId,
  };
}

export function getWorkoutEditorSnapshot(state: WorkoutEditorState): WorkoutEditorSnapshot {
  return {
    name: state.name,
    notes: state.notes,
    days: state.days.map((day) => ({
      label: day.label,
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        loadKg: exercise.loadKg,
        notes: exercise.notes,
        tempo: exercise.tempo,
      })),
    })),
  };
}

export function isWorkoutEditorDirty(
  state: WorkoutEditorState,
  baseline: WorkoutEditorSnapshot,
): boolean {
  return JSON.stringify(getWorkoutEditorSnapshot(state)) !== JSON.stringify(baseline);
}
