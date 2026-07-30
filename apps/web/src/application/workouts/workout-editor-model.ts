import type { MuscleGroup } from '@/lib/muscle-groups';

export type ExerciseLite = { id: string; name: string; muscleGroup: MuscleGroup };

export type WorkoutExerciseState = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: string;
  restSeconds?: number;
  loadKg?: number;
  notes?: string;
};

export type WorkoutDayState = {
  id: string;
  label: string;
  exercises: WorkoutExerciseState[];
};

export type WorkoutStatus = 'draft' | 'active' | 'archived';

export type CreateWorkoutInput = {
  studentId: string;
  name: string;
  notes?: string;
  status: WorkoutStatus;
  days: Array<{
    label: string;
    dayOrder: number;
    exercises: Array<{
      exerciseId: string;
      exerciseOrder: number;
      sets: number;
      reps: string;
      restSeconds?: number;
      loadKg?: number;
      tempo?: string;
      notes?: string;
    }>;
  }>;
};

const defaultLabels = [
  'Treino A',
  'Treino B',
  'Treino C',
  'Treino D',
  'Treino E',
  'Treino F',
  'Treino G',
];

export function createWorkoutDay(label: string, createId: () => string): WorkoutDayState {
  return { id: createId(), label, exercises: [] };
}

export function addWorkoutDay(days: WorkoutDayState[], createId: () => string): WorkoutDayState[] {
  if (days.length >= 7) return days;
  return [
    ...days,
    createWorkoutDay(defaultLabels[days.length] ?? `Treino ${days.length + 1}`, createId),
  ];
}

export function removeWorkoutDay(days: WorkoutDayState[], index: number): WorkoutDayState[] {
  if (days.length === 1) return days;
  return days.filter((_, dayIndex) => dayIndex !== index);
}

export function updateWorkoutDayLabel(
  days: WorkoutDayState[],
  index: number,
  label: string,
): WorkoutDayState[] {
  return days.map((day, dayIndex) => (dayIndex === index ? { ...day, label } : day));
}

export function addWorkoutExercise(
  days: WorkoutDayState[],
  activeDay: number,
  exercise: ExerciseLite,
): WorkoutDayState[] {
  return days.map((day, dayIndex) =>
    dayIndex === activeDay
      ? {
          ...day,
          exercises: [
            ...day.exercises,
            {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              muscleGroup: exercise.muscleGroup,
              sets: 3,
              reps: '10',
            },
          ],
        }
      : day,
  );
}

export function removeWorkoutExercise(
  days: WorkoutDayState[],
  dayIndex: number,
  exerciseIndex: number,
): WorkoutDayState[] {
  return days.map((day, currentDayIndex) =>
    currentDayIndex === dayIndex
      ? {
          ...day,
          exercises: day.exercises.filter(
            (_, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex,
          ),
        }
      : day,
  );
}

export function moveWorkoutExercise(
  days: WorkoutDayState[],
  dayIndex: number,
  exerciseIndex: number,
  direction: -1 | 1,
): WorkoutDayState[] {
  return days.map((day, currentDayIndex) => {
    if (currentDayIndex !== dayIndex) return day;
    const next = [...day.exercises];
    const targetIndex = exerciseIndex + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return day;
    const current = next[exerciseIndex];
    const target = next[targetIndex];
    if (!current || !target) return day;
    next[exerciseIndex] = target;
    next[targetIndex] = current;
    return { ...day, exercises: next };
  });
}

export function updateWorkoutExercise<K extends keyof WorkoutExerciseState>(
  days: WorkoutDayState[],
  dayIndex: number,
  exerciseIndex: number,
  key: K,
  value: WorkoutExerciseState[K],
): WorkoutDayState[] {
  return days.map((day, currentDayIndex) =>
    currentDayIndex === dayIndex
      ? {
          ...day,
          exercises: day.exercises.map((exercise, currentExerciseIndex) =>
            currentExerciseIndex === exerciseIndex ? { ...exercise, [key]: value } : exercise,
          ),
        }
      : day,
  );
}

export function validateWorkoutDraft(name: string, days: WorkoutDayState[]): string | null {
  if (!name.trim()) return 'Informe um nome para o treino.';
  if (days.some((day) => day.exercises.length === 0)) {
    return 'Cada dia precisa ter ao menos 1 exercicio.';
  }
  return null;
}

export function buildCreateWorkoutInput({
  studentId,
  name,
  notes,
  status,
  days,
}: {
  studentId: string;
  name: string;
  notes: string;
  status: WorkoutStatus;
  days: WorkoutDayState[];
}): CreateWorkoutInput {
  return {
    studentId,
    name: name.trim(),
    notes: notes.trim() || undefined,
    status,
    days: days.map((day, dayIndex) => ({
      label: day.label,
      dayOrder: dayIndex,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        exerciseId: exercise.exerciseId,
        exerciseOrder: exerciseIndex,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        loadKg: exercise.loadKg,
        notes: exercise.notes,
      })),
    })),
  };
}
