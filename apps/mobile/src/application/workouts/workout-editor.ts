import { createWorkoutPlanSchema, updateWorkoutPlanSchema } from '@muvit/validators';
import type {
  CreateTrainerWorkoutPlanInput,
  TrainerWorkoutPlan,
  UpdateTrainerWorkoutPlanInput,
} from './trainer-workout-data';

export type WorkoutEditorStatus = 'active' | 'draft';

export type WorkoutEditorExercise = {
  localId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: string;
  reps: string;
  restSeconds: string;
  loadKg: string;
  notes: string;
  tempo?: string;
};

export type WorkoutEditorDay = {
  localId: string;
  label: string;
  exercises: WorkoutEditorExercise[];
};

export type WorkoutEditorState = {
  name: string;
  notes: string;
  status: WorkoutEditorStatus;
  days: WorkoutEditorDay[];
};

export type WorkoutEditorExerciseReference = {
  id: string;
  name: string;
  muscleGroup: string;
};

export type WorkoutEditorExerciseField = 'sets' | 'reps' | 'loadKg' | 'restSeconds' | 'notes';

export type BuildWorkoutInputResult<T> = { ok: true; body: T } | { ok: false; message: string };

const DEFAULT_DAY_LABELS = [
  'Treino A',
  'Treino B',
  'Treino C',
  'Treino D',
  'Treino E',
  'Treino F',
  'Treino G',
] as const;

type WorkoutPlanDayInput = CreateTrainerWorkoutPlanInput['days'][number];
type WorkoutPlanExerciseInput = WorkoutPlanDayInput['exercises'][number];

export function createEmptyWorkoutEditorState(createId: () => string): WorkoutEditorState {
  return {
    name: '',
    notes: '',
    status: 'draft',
    days: [
      {
        localId: createId(),
        label: DEFAULT_DAY_LABELS[0],
        exercises: [],
      },
    ],
  };
}

export function hydrateWorkoutEditorState(
  plan: TrainerWorkoutPlan,
  createId: () => string,
): WorkoutEditorState {
  return {
    name: plan.name,
    notes: plan.notes ?? '',
    status: plan.status === 'active' ? 'active' : 'draft',
    days: plan.days.map((day) => ({
      localId: createId(),
      label: day.label,
      exercises: day.exercises.map((item) => ({
        localId: createId(),
        exerciseId: item.exerciseId,
        exerciseName: item.exercise.name,
        muscleGroup: item.exercise.muscleGroup,
        sets: String(item.sets),
        reps: item.reps,
        restSeconds: item.restSeconds === null ? '' : String(item.restSeconds),
        loadKg: item.loadKg === null ? '' : String(item.loadKg),
        notes: item.notes ?? '',
        tempo: item.tempo ?? undefined,
      })),
    })),
  };
}

export function addWorkoutEditorDay(
  state: WorkoutEditorState,
  createId: () => string,
): WorkoutEditorState {
  if (state.days.length >= DEFAULT_DAY_LABELS.length) return state;

  const label = DEFAULT_DAY_LABELS[state.days.length];
  if (!label) return state;

  return {
    ...state,
    days: [
      ...state.days,
      {
        localId: createId(),
        label,
        exercises: [],
      },
    ],
  };
}

export function removeWorkoutEditorDay(
  state: WorkoutEditorState,
  dayLocalId: string,
): WorkoutEditorState {
  if (state.days.length <= 1) return state;
  if (!state.days.some((day) => day.localId === dayLocalId)) return state;

  return {
    ...state,
    days: state.days.filter((day) => day.localId !== dayLocalId),
  };
}

export function updateWorkoutEditorPlanField(
  state: WorkoutEditorState,
  field: 'name' | 'notes',
  value: string,
): WorkoutEditorState;
export function updateWorkoutEditorPlanField(
  state: WorkoutEditorState,
  field: 'status',
  value: WorkoutEditorStatus,
): WorkoutEditorState;
export function updateWorkoutEditorPlanField(
  state: WorkoutEditorState,
  field: 'name' | 'notes' | 'status',
  value: string,
): WorkoutEditorState {
  if (field === 'status') {
    if (value !== 'active' && value !== 'draft') return state;
    if (state.status === value) return state;
    return { ...state, status: value };
  }

  if (state[field] === value) return state;
  return { ...state, [field]: value };
}

export function updateWorkoutEditorDayLabel(
  state: WorkoutEditorState,
  dayLocalId: string,
  value: string,
): WorkoutEditorState {
  const day = state.days.find((item) => item.localId === dayLocalId);
  if (!day || day.label === value) return state;

  return {
    ...state,
    days: state.days.map((item) =>
      item.localId === dayLocalId ? { ...item, label: value } : item,
    ),
  };
}

export function addWorkoutEditorExercise(
  state: WorkoutEditorState,
  dayLocalId: string,
  exercise: WorkoutEditorExerciseReference,
  createId: () => string,
): WorkoutEditorState {
  const day = state.days.find((item) => item.localId === dayLocalId);
  if (!day) return state;

  const nextExercise: WorkoutEditorExercise = {
    localId: createId(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    sets: '3',
    reps: '10',
    loadKg: '',
    restSeconds: '',
    notes: '',
    tempo: undefined,
  };

  return {
    ...state,
    days: state.days.map((item) =>
      item.localId === dayLocalId
        ? { ...item, exercises: [...item.exercises, nextExercise] }
        : item,
    ),
  };
}

export function removeWorkoutEditorExercise(
  state: WorkoutEditorState,
  dayLocalId: string,
  exerciseLocalId: string,
): WorkoutEditorState {
  const day = state.days.find((item) => item.localId === dayLocalId);
  if (!day || !day.exercises.some((item) => item.localId === exerciseLocalId)) return state;

  return {
    ...state,
    days: state.days.map((item) =>
      item.localId === dayLocalId
        ? {
            ...item,
            exercises: item.exercises.filter((exercise) => exercise.localId !== exerciseLocalId),
          }
        : item,
    ),
  };
}

export function moveWorkoutEditorExercise(
  state: WorkoutEditorState,
  dayLocalId: string,
  exerciseLocalId: string,
  direction: -1 | 1,
): WorkoutEditorState {
  const day = state.days.find((item) => item.localId === dayLocalId);
  const currentIndex = day?.exercises.findIndex((item) => item.localId === exerciseLocalId) ?? -1;
  const targetIndex = currentIndex + direction;

  if (!day || currentIndex < 0 || targetIndex < 0 || targetIndex >= day.exercises.length) {
    return state;
  }

  const exercises = [...day.exercises];
  const current = exercises[currentIndex];
  const target = exercises[targetIndex];
  if (!current || !target) return state;

  exercises[currentIndex] = target;
  exercises[targetIndex] = current;

  return {
    ...state,
    days: state.days.map((item) => (item.localId === dayLocalId ? { ...item, exercises } : item)),
  };
}

export function updateWorkoutEditorExerciseField(
  state: WorkoutEditorState,
  dayLocalId: string,
  exerciseLocalId: string,
  field: WorkoutEditorExerciseField,
  value: string,
): WorkoutEditorState {
  const day = state.days.find((item) => item.localId === dayLocalId);
  const exercise = day?.exercises.find((item) => item.localId === exerciseLocalId);
  if (!day || !exercise || exercise[field] === value) return state;

  return {
    ...state,
    days: state.days.map((item) =>
      item.localId === dayLocalId
        ? {
            ...item,
            exercises: item.exercises.map((current) =>
              current.localId === exerciseLocalId ? { ...current, [field]: value } : current,
            ),
          }
        : item,
    ),
  };
}

export function buildCreateTrainerWorkoutInput(
  state: WorkoutEditorState,
  studentId: string,
): BuildWorkoutInputResult<CreateTrainerWorkoutPlanInput> {
  const basicError = validateBasicEditorState(state);
  if (basicError) return { ok: false, message: basicError };

  const days = buildWorkoutDays(state, false);
  if (!days.ok) return days;

  const candidate: CreateTrainerWorkoutPlanInput = {
    studentId,
    name: state.name.trim(),
    status: state.status,
    days: days.body,
  };
  const notes = state.notes.trim();
  if (notes) candidate.notes = notes;

  const parsed = createWorkoutPlanSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, message: 'Revise os dados do treino.' };

  return { ok: true, body: parsed.data };
}

export function buildUpdateTrainerWorkoutInput(
  state: WorkoutEditorState,
): BuildWorkoutInputResult<UpdateTrainerWorkoutPlanInput> {
  const basicError = validateBasicEditorState(state);
  if (basicError) return { ok: false, message: basicError };

  const days = buildWorkoutDays(state, true);
  if (!days.ok) return days;

  const candidate: UpdateTrainerWorkoutPlanInput = {
    name: state.name.trim(),
    notes: state.notes.trim(),
    status: state.status,
    days: days.body,
  };

  const parsed = updateWorkoutPlanSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, message: 'Revise os dados do treino.' };

  return { ok: true, body: parsed.data };
}

function validateBasicEditorState(state: WorkoutEditorState): string | undefined {
  if (!state.name.trim()) return 'Informe um nome para o treino.';
  if (state.days.length < 1 || state.days.length > DEFAULT_DAY_LABELS.length) {
    return 'O treino deve ter entre 1 e 7 dias.';
  }
  if (state.days.some((day) => !day.label.trim())) {
    return 'Informe um nome para cada dia.';
  }
  if (state.days.some((day) => day.exercises.length === 0)) {
    return 'Cada dia precisa ter ao menos 1 exercício.';
  }
  if (state.days.some((day) => day.exercises.some((exercise) => !exercise.reps.trim()))) {
    return 'Repetições são obrigatórias.';
  }

  return undefined;
}

function buildWorkoutDays(
  state: WorkoutEditorState,
  preserveTempo: boolean,
): BuildWorkoutInputResult<WorkoutPlanDayInput[]> {
  const days: WorkoutPlanDayInput[] = [];

  for (const [dayIndex, day] of state.days.entries()) {
    const exercises: WorkoutPlanExerciseInput[] = [];

    for (const [exerciseIndex, exercise] of day.exercises.entries()) {
      const sets = parseRequiredInteger('Séries', exercise.sets, 1, 20);
      if (!sets.ok) return sets;

      const loadKg = parseOptionalDecimal('Carga', exercise.loadKg, 0, 1000);
      if (!loadKg.ok) return loadKg;

      const restSeconds = parseOptionalInteger(
        'Descanso',
        exercise.restSeconds,
        0,
        600,
        'segundos',
      );
      if (!restSeconds.ok) return restSeconds;

      const nextExercise: WorkoutPlanExerciseInput = {
        exerciseId: exercise.exerciseId,
        exerciseOrder: exerciseIndex,
        sets: sets.value,
        reps: exercise.reps.trim(),
      };

      if (loadKg.value !== undefined) nextExercise.loadKg = loadKg.value;
      if (restSeconds.value !== undefined) nextExercise.restSeconds = restSeconds.value;

      const notes = exercise.notes.trim();
      if (notes) nextExercise.notes = notes;
      if (preserveTempo && exercise.tempo !== undefined) nextExercise.tempo = exercise.tempo;

      exercises.push(nextExercise);
    }

    days.push({
      label: day.label.trim(),
      dayOrder: dayIndex,
      exercises,
    });
  }

  return { ok: true, body: days };
}

function parseRequiredInteger(
  label: string,
  raw: string,
  min: number,
  max: number,
  unit?: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const normalized = raw.trim();
  if (!/^-?\d+$/.test(normalized)) {
    return { ok: false, message: `${label} deve ser um número inteiro.` };
  }

  const value = Number(normalized);
  if (value < min || value > max) {
    return {
      ok: false,
      message: `${label} deve estar entre ${min} e ${max}${unit ? ` ${unit}` : ''}.`,
    };
  }

  return { ok: true, value };
}

function parseOptionalDecimal(
  label: string,
  raw: string,
  min: number,
  max: number,
): { ok: true; value?: number } | { ok: false; message: string } {
  const normalized = raw.replace(',', '.').trim();
  if (!normalized) return { ok: true, value: undefined };

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} deve ser um número válido.` };
  }
  if (value < min || value > max) {
    return {
      ok: false,
      message: `${label} deve estar entre ${min} e ${max}${label === 'Carga' ? ' kg' : ''}.`,
    };
  }

  return { ok: true, value };
}

function parseOptionalInteger(
  label: string,
  raw: string,
  min: number,
  max: number,
  unit?: string,
): { ok: true; value?: number } | { ok: false; message: string } {
  const normalized = raw.trim();
  if (!normalized) return { ok: true, value: undefined };
  if (!/^-?\d+$/.test(normalized)) {
    return { ok: false, message: `${label} deve ser um número inteiro.` };
  }

  const value = Number(normalized);
  if (value < min || value > max) {
    return {
      ok: false,
      message: `${label} deve estar entre ${min} e ${max}${unit ? ` ${unit}` : ''}.`,
    };
  }

  return { ok: true, value };
}
