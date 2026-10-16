import type { WorkoutPlanDraft } from '@muvit/validators';
import { describe, expect, it } from 'vitest';
import {
  addWorkoutEditorExercise,
  createEmptyWorkoutEditorState,
  moveWorkoutEditorExercise,
  updateWorkoutEditorExerciseField,
  updateWorkoutEditorPlanField,
} from './workout-editor';
import {
  getWorkoutEditorSnapshot,
  hydrateWorkoutDraftEditorState,
  isWorkoutEditorDirty,
} from './workout-editor-draft';

const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';
const SECOND_EXERCISE_ID = '00000000-0000-0000-0000-000000000102';

function workoutDraft(): WorkoutPlanDraft {
  return {
    id: '00000000-0000-0000-0000-000000000301',
    trainerId: '00000000-0000-0000-0000-000000000901',
    studentId: '00000000-0000-0000-0000-000000000001',
    sourcePlanId: null,
    payload: {
      name: 'Força',
      notes: 'Progressão semanal',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: EXERCISE_ID,
              exerciseOrder: 0,
              sets: 4,
              reps: '8-10',
              restSeconds: 90,
              loadKg: 82.5,
              tempo: '3010',
              notes: 'Sem falhar',
            },
          ],
        },
        {
          label: 'Treino B',
          dayOrder: 1,
          exercises: [
            {
              exerciseId: SECOND_EXERCISE_ID,
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
            },
          ],
        },
      ],
    },
    selectedDayOrder: 1,
    revision: 2,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T11:00:00.000Z',
    exerciseReferences: [
      { id: EXERCISE_ID, name: 'Supino reto', muscleGroup: 'chest' },
      { id: SECOND_EXERCISE_ID, name: 'Remada baixa', muscleGroup: 'back' },
    ],
  };
}

function idFactory(): () => string {
  let index = 0;
  return () => `local-${++index}`;
}

describe('workout-editor-draft', () => {
  it('hidrata valores e referências do servidor e devolve o dia selecionado', () => {
    const result = hydrateWorkoutDraftEditorState(workoutDraft(), idFactory());

    expect(result.state).toMatchObject({
      name: 'Força',
      notes: 'Progressão semanal',
      status: 'active',
      days: [
        {
          label: 'Treino A',
          exercises: [
            {
              exerciseId: EXERCISE_ID,
              exerciseName: 'Supino reto',
              muscleGroup: 'chest',
              sets: '4',
              reps: '8-10',
              restSeconds: '90',
              loadKg: '82.5',
              notes: 'Sem falhar',
              tempo: '3010',
            },
          ],
        },
        {
          label: 'Treino B',
          exercises: [
            {
              exerciseId: SECOND_EXERCISE_ID,
              exerciseName: 'Remada baixa',
              muscleGroup: 'back',
              sets: '3',
              reps: '10',
              restSeconds: '',
              loadKg: '',
              notes: '',
              tempo: undefined,
            },
          ],
        },
      ],
    });
    expect(result.selectedDayOrder).toBe(1);
    expect(result.selectedDayLocalId).toBe(result.state.days[1]?.localId);
  });

  it('ignora IDs locais e o status não publicado do editor', () => {
    const nextId = idFactory();
    let state = createEmptyWorkoutEditorState(nextId);
    state = updateWorkoutEditorPlanField(state, 'name', 'Força');
    state = addWorkoutEditorExercise(
      state,
      state.days[0]?.localId ?? '',
      { id: EXERCISE_ID, name: 'Supino reto', muscleGroup: 'chest' },
      nextId,
    );
    const baseline = getWorkoutEditorSnapshot(state);
    const newLocalIdentity = {
      ...state,
      status: 'draft' as const,
      days: state.days.map((day) => ({
        ...day,
        localId: 'another-day-id',
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          localId: 'another-exercise-id',
        })),
      })),
    };

    expect(getWorkoutEditorSnapshot(newLocalIdentity)).toEqual(baseline);
    expect(isWorkoutEditorDirty(newLocalIdentity, baseline)).toBe(false);
  });

  it('marca alterações semânticas e limpa o dirty após restaurar valores e ordem', () => {
    const nextId = idFactory();
    let state = createEmptyWorkoutEditorState(nextId);
    const firstDayId = state.days[0]?.localId ?? '';
    state = updateWorkoutEditorPlanField(state, 'name', 'Força');
    state = addWorkoutEditorExercise(
      state,
      firstDayId,
      { id: EXERCISE_ID, name: 'Supino reto', muscleGroup: 'chest' },
      nextId,
    );
    state = addWorkoutEditorExercise(
      state,
      firstDayId,
      { id: SECOND_EXERCISE_ID, name: 'Remada baixa', muscleGroup: 'back' },
      nextId,
    );
    const baseline = getWorkoutEditorSnapshot(state);
    const exerciseId = state.days[0]?.exercises[0]?.localId ?? '';

    const edited = updateWorkoutEditorExerciseField(state, firstDayId, exerciseId, 'reps', '8-12');
    expect(isWorkoutEditorDirty(edited, baseline)).toBe(true);
    const restored = updateWorkoutEditorExerciseField(state, firstDayId, exerciseId, 'reps', '10');
    expect(isWorkoutEditorDirty(restored, baseline)).toBe(false);

    const reordered = moveWorkoutEditorExercise(state, firstDayId, exerciseId, 1);
    expect(isWorkoutEditorDirty(reordered, baseline)).toBe(true);
    const orderRestored = moveWorkoutEditorExercise(reordered, firstDayId, exerciseId, -1);
    expect(isWorkoutEditorDirty(orderRestored, baseline)).toBe(false);
  });
});
