import { describe, expect, it } from 'vitest';
import type { WorkoutDay } from '../../lib/use-guided-workout-session';
import type { GuidedSession } from './guided-session';
import { adjustSessionValue, selectGuidedSessionView } from './guided-session-presentation';

const day: WorkoutDay = {
  id: 'day-1',
  planId: 'plan-1',
  label: 'Treino A',
  dayOrder: 0,
  exercises: [
    {
      id: 'workout-exercise-1',
      workoutDayId: 'day-1',
      exerciseId: 'exercise-1',
      exerciseOrder: 0,
      sets: 2,
      reps: '8 a 12',
      loadKg: 40,
      restSeconds: 60,
      tempo: null,
      notes: 'Controle o movimento.',
      exercise: { id: 'exercise-1', name: 'Supino reto', muscleGroup: 'Peito' },
    },
    {
      id: 'workout-exercise-2',
      workoutDayId: 'day-1',
      exerciseId: 'exercise-2',
      exerciseOrder: 1,
      sets: 1,
      reps: '12',
      loadKg: null,
      restSeconds: 45,
      tempo: null,
      notes: null,
      exercise: { id: 'exercise-2', name: 'Remada baixa', muscleGroup: 'Costas' },
    },
  ],
};

const sets: GuidedSession['sets'] = [
  {
    workoutExerciseId: 'workout-exercise-1',
    setNumber: 1,
    repsDone: '10',
    loadKg: '40',
    completed: true,
  },
  {
    workoutExerciseId: 'workout-exercise-1',
    setNumber: 2,
    repsDone: '',
    loadKg: '40',
    completed: false,
  },
  {
    workoutExerciseId: 'workout-exercise-2',
    setNumber: 1,
    repsDone: '',
    loadKg: '',
    completed: false,
  },
];

function session(overrides: Partial<GuidedSession> = {}): GuidedSession {
  return {
    version: 2,
    workoutDayId: day.id,
    startedAtMs: 1,
    updatedAtMs: 1,
    activeDurationMs: 0,
    activeSinceMs: 1,
    currentExerciseIndex: 0,
    currentSetIndex: 1,
    phase: 'set',
    restEndsAtMs: null,
    sets: sets.map((set) => ({ ...set })),
    ...overrides,
  };
}

describe('guided session presentation', () => {
  it('selects the current set, the last completed set and the next exercise without advancing', () => {
    const current = session();

    const view = selectGuidedSessionView(day, current);

    expect(view.currentExercise).toBe(day.exercises[0]);
    expect(view.currentSet).toBe(current.sets[1]);
    expect(view.previousSet).toBe(current.sets[0]);
    expect(view.nextExercise).toBe(day.exercises[1]);
    expect(view.progress).toMatchObject({ completedExerciseCount: 0, totalExerciseCount: 2 });
    expect(current.currentExerciseIndex).toBe(0);
  });

  it('does not use a completed set from a different exercise as the previous reference', () => {
    const current = session({
      currentExerciseIndex: 1,
      currentSetIndex: 0,
      sets: sets.map((set) =>
        set.workoutExerciseId === 'workout-exercise-2' ? { ...set, completed: false } : set,
      ),
    });

    expect(selectGuidedSessionView(day, current).previousSet).toBeUndefined();
  });

  it('counts completed exercises using workout progress rather than completed sets', () => {
    const firstExerciseComplete = session({
      currentExerciseIndex: 1,
      currentSetIndex: 0,
      sets: sets.map((set) =>
        set.workoutExerciseId === 'workout-exercise-1' ? { ...set, completed: true } : set,
      ),
    });

    expect(selectGuidedSessionView(day, firstExerciseComplete).progress).toMatchObject({
      completedExerciseCount: 1,
      totalExerciseCount: 2,
      progressPercent: 50,
    });
  });

  it('increments an empty value from zero and keeps decrements nonnegative', () => {
    expect(adjustSessionValue('', 1)).toBe('1');
    expect(adjustSessionValue('', -1)).toBe('0');
    expect(adjustSessionValue('0', -1)).toBe('0');
  });

  it('normalizes comma decimals for button adjustments', () => {
    expect(adjustSessionValue('16,5', 1)).toBe('17.5');
  });

  it('preserves a nonnumeric value when a step button is pressed', () => {
    expect(adjustSessionValue('livre', 1)).toBe('livre');
  });
});
