import type { MuscleGroup } from '@/lib/muscle-groups';

export type ExerciseLite = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
};

export type WorkoutExerciseDraft = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  sets: number;
  reps: string;
  restSeconds?: number;
  loadKg?: number;
  tempo?: string;
  notes?: string;
};

export type WorkoutDayDraft = {
  id: string;
  label: string;
  exercises: WorkoutExerciseDraft[];
};

export type WorkoutStatus = 'draft' | 'active' | 'archived';

export type WorkoutDraft = {
  studentId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: WorkoutStatus;
  notes: string;
  days: WorkoutDayDraft[];
};

export type CreateWorkoutInput = {
  studentId: string;
  name: string;
  startDate?: string;
  endDate?: string;
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

export function createWorkoutDay(label: string, createId: () => string): WorkoutDayDraft {
  return { id: createId(), label, exercises: [] };
}

export function createWorkoutDraft(studentId: string, createId: () => string): WorkoutDraft {
  return {
    studentId,
    name: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    notes: '',
    days: [createWorkoutDay('Treino A', createId)],
  };
}

export function discardWorkoutDraft(draft: WorkoutDraft, createId: () => string): WorkoutDraft {
  return createWorkoutDraft(draft.studentId, createId);
}

export function addWorkoutDay(days: WorkoutDayDraft[], createId: () => string): WorkoutDayDraft[] {
  if (days.length >= 7) return days;
  return [
    ...days,
    createWorkoutDay(defaultLabels[days.length] ?? `Treino ${days.length + 1}`, createId),
  ];
}

export function removeWorkoutDay(days: WorkoutDayDraft[], index: number): WorkoutDayDraft[] {
  if (days.length === 1) return days;
  return days.filter((_, dayIndex) => dayIndex !== index);
}

export function updateWorkoutDayLabel(
  days: WorkoutDayDraft[],
  index: number,
  label: string,
): WorkoutDayDraft[] {
  return days.map((day, dayIndex) => (dayIndex === index ? { ...day, label } : day));
}

export function addWorkoutExercise(
  days: WorkoutDayDraft[],
  activeDay: number,
  exercise: ExerciseLite,
): WorkoutDayDraft[] {
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
              equipment: exercise.equipment,
              sets: 3,
              reps: '10',
            },
          ],
        }
      : day,
  );
}

export function removeWorkoutExercise(
  days: WorkoutDayDraft[],
  dayIndex: number,
  exerciseIndex: number,
): WorkoutDayDraft[] {
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
  days: WorkoutDayDraft[],
  dayIndex: number,
  exerciseIndex: number,
  direction: -1 | 1,
): WorkoutDayDraft[] {
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

export function updateWorkoutExercise<K extends keyof WorkoutExerciseDraft>(
  days: WorkoutDayDraft[],
  dayIndex: number,
  exerciseIndex: number,
  key: K,
  value: WorkoutExerciseDraft[K],
): WorkoutDayDraft[] {
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

export function validateWorkoutDraft(draft: WorkoutDraft): string | null {
  if (!draft.name.trim()) return 'Informe um nome para o treino.';
  if (draft.days.some((day) => day.exercises.length === 0)) {
    return 'Cada dia precisa ter ao menos 1 exercício.';
  }
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    return 'A data final não pode ser anterior à data inicial.';
  }
  return null;
}

export function buildCreateWorkoutInput({
  studentId,
  name,
  startDate,
  endDate,
  notes,
  status,
  days,
}: WorkoutDraft): CreateWorkoutInput {
  return {
    studentId,
    name: name.trim(),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
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
        tempo: exercise.tempo,
        notes: exercise.notes,
      })),
    })),
  };
}
