import type { WorkoutDay } from '../../lib/use-guided-workout-session';
import type { GuidedSession } from './guided-session';
import { getWorkoutDraftProgress } from './today-workout';
import { type WorkoutSetState, toOptionalNumber } from './workout-log';

export type GuidedSessionView = {
  currentExercise: WorkoutDay['exercises'][number] | undefined;
  currentSet: WorkoutSetState | undefined;
  previousSet: WorkoutSetState | undefined;
  nextExercise: WorkoutDay['exercises'][number] | undefined;
  progress: ReturnType<typeof getWorkoutDraftProgress>;
};

export function selectGuidedSessionView(
  day: WorkoutDay,
  session: GuidedSession,
): GuidedSessionView {
  const currentExercise = day.exercises[session.currentExerciseIndex];
  const nextExercise = day.exercises[session.currentExerciseIndex + 1];
  const exerciseSets = currentExercise
    ? session.sets.filter((set) => set.workoutExerciseId === currentExercise.id)
    : [];
  const currentSet = exerciseSets[session.currentSetIndex];
  const currentSetIndex = currentSet ? session.sets.indexOf(currentSet) : -1;
  const previousSet =
    currentSetIndex < 0
      ? undefined
      : session.sets
          .slice(0, currentSetIndex)
          .reverse()
          .find((set) => set.workoutExerciseId === currentExercise?.id && set.completed);

  return {
    currentExercise,
    currentSet,
    previousSet,
    nextExercise,
    progress: getWorkoutDraftProgress(day, session),
  };
}

export function adjustSessionValue(value: string, delta: 1 | -1): string {
  const parsedValue = value.trim() === '' ? 0 : toOptionalNumber(value);
  if (parsedValue === undefined) return value;
  return String(Math.max(0, parsedValue + delta));
}
