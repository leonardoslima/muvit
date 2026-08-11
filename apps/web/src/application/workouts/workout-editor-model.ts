import type { MuscleGroup } from '@/lib/muscle-groups';
import { type CreateWorkoutPlanInput, createWorkoutPlanSchema } from '@muvit/validators';

export type ExerciseLite = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
};

export type WorkoutExerciseDraft = {
  id: string;
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

export type CreateWorkoutInput = CreateWorkoutPlanInput;

export type WorkoutDraftValidationError = {
  path: string;
  message: string;
};

export type WorkoutDraftValidationResult =
  | { success: true; input: CreateWorkoutInput }
  | { success: false; errors: WorkoutDraftValidationError[] };

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
  const usedLabels = new Set(days.map((day) => day.label.trim()));
  const label = defaultLabels.find((candidate) => !usedLabels.has(candidate));
  if (!label) return days;
  return [...days, createWorkoutDay(label, createId)];
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
  createId: () => string,
): WorkoutDayDraft[] {
  return days.map((day, dayIndex) =>
    dayIndex === activeDay
      ? {
          ...day,
          exercises: [
            ...day.exercises,
            {
              id: createId(),
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

export function validateWorkoutDraft(draft: WorkoutDraft): WorkoutDraftValidationResult {
  const input = buildCreateWorkoutInput(draft);
  const parsed = createWorkoutPlanSchema.safeParse(input);
  const errors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        path: toStableValidationPath(issue.path, draft),
        message: validationMessage(issue.path.at(-1)),
      }));

  for (const day of draft.days) {
    if (day.exercises.length === 0) {
      errors.push({
        path: `days.${day.id}.exercises`,
        message: 'Adicione ao menos um exercício neste dia.',
      });
    }
  }

  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    errors.push({
      path: 'endDate',
      message: 'A data final não pode ser anterior à data inicial.',
    });
  }

  if (errors.length > 0 || !parsed.success) return { success: false, errors };
  return { success: true, input: parsed.data };
}

function toStableValidationPath(path: PropertyKey[], draft: WorkoutDraft): string {
  const stable: string[] = [];
  for (let index = 0; index < path.length; index += 1) {
    const part = path[index];
    if (part === 'days' && typeof path[index + 1] === 'number') {
      const dayIndex = path[index + 1] as number;
      const day = draft.days[dayIndex];
      stable.push('days', day?.id ?? String(dayIndex));
      index += 1;
      continue;
    }
    if (part === 'exercises' && typeof path[index + 1] === 'number') {
      const exerciseIndex = path[index + 1] as number;
      const dayIndex = typeof path[1] === 'number' ? path[1] : -1;
      const exercise = draft.days[dayIndex]?.exercises[exerciseIndex];
      stable.push('exercises', exercise?.id ?? String(exerciseIndex));
      index += 1;
      continue;
    }
    stable.push(String(part));
  }
  return stable.join('.');
}

function validationMessage(field: PropertyKey | undefined): string {
  const messages: Record<string, string> = {
    studentId: 'Selecione um aluno válido.',
    name: 'Informe um nome com até 200 caracteres.',
    startDate: 'Informe uma data inicial válida.',
    endDate: 'Informe uma data final válida.',
    notes: 'Respeite o limite de caracteres das notas.',
    label: 'Informe um nome de dia com até 50 caracteres.',
    exerciseId: 'Selecione um exercício válido.',
    sets: 'Use um número inteiro de séries entre 1 e 20.',
    reps: 'Informe repetições com até 20 caracteres.',
    restSeconds: 'Use um descanso inteiro entre 0 e 600 segundos.',
    loadKg: 'Use uma carga entre 0 e 1000 kg.',
    tempo: 'Informe um tempo com até 10 caracteres.',
  };
  return messages[String(field)] ?? 'Revise este campo.';
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
      label: day.label.trim(),
      dayOrder: dayIndex,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        exerciseId: exercise.exerciseId,
        exerciseOrder: exerciseIndex,
        sets: exercise.sets,
        reps: exercise.reps.trim(),
        restSeconds: exercise.restSeconds,
        loadKg: exercise.loadKg,
        tempo: exercise.tempo?.trim() || undefined,
        notes: exercise.notes?.trim() || undefined,
      })),
    })),
  };
}
