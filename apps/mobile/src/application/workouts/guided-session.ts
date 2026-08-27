import { type WorkoutSetState, buildInitialSets } from './workout-log';

export type GuidedSessionPhase =
  | 'set'
  | 'rest'
  | 'exercise-complete'
  | 'ready-to-finish'
  | 'summary';

export type GuidedSession = {
  version: 2;
  workoutDayId: string;
  startedAtMs: number;
  updatedAtMs: number;
  activeDurationMs: number;
  activeSinceMs: number | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  phase: GuidedSessionPhase;
  restEndsAtMs: number | null;
  sets: WorkoutSetState[];
};

export type GuidedSessionSummary = {
  durationMin: number;
  exerciseCount: number;
  completedSetCount: number;
  volumeKg: number;
};

export type GuidedSessionExercise = {
  id: string;
  sets: number;
  reps?: string;
  loadKg: string | number | null | undefined;
  restSeconds?: number | null;
};

export type GuidedSessionDay = {
  id: string;
  exercises: GuidedSessionExercise[];
};

type CurrentSetValues = Partial<Pick<WorkoutSetState, 'repsDone' | 'loadKg'>>;

const REST_EXTENSION_MS = 15_000;

export function createGuidedSession(day: GuidedSessionDay, startedAtMs: number): GuidedSession {
  const sets = buildInitialSets(
    day.exercises.map((exercise) => ({
      id: exercise.id,
      sets: exercise.sets,
      loadKg: exercise.loadKg ?? null,
    })),
  );

  if (day.exercises.length === 0 || sets.length === 0) {
    throw new Error('o treino precisa de ao menos uma série');
  }

  return {
    version: 2,
    workoutDayId: day.id,
    startedAtMs,
    updatedAtMs: startedAtMs,
    activeDurationMs: 0,
    activeSinceMs: startedAtMs,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    phase: 'set',
    restEndsAtMs: null,
    sets,
  };
}

export function pauseGuidedSession(session: GuidedSession, pausedAtMs: number): GuidedSession {
  if (session.activeSinceMs === null) return session;

  return {
    ...session,
    activeDurationMs: session.activeDurationMs + Math.max(0, pausedAtMs - session.activeSinceMs),
    activeSinceMs: null,
    updatedAtMs: pausedAtMs,
  };
}

export function resumeGuidedSession(session: GuidedSession, resumedAtMs: number): GuidedSession {
  if (session.activeSinceMs !== null || session.phase === 'summary') return session;

  return { ...session, activeSinceMs: resumedAtMs, updatedAtMs: resumedAtMs };
}

export function getCurrentSet(session: GuidedSession): WorkoutSetState | undefined {
  const exerciseSets = session.sets.filter(
    (set) => set.workoutExerciseId === getCurrentExerciseId(session),
  );
  if (
    !Number.isInteger(session.currentSetIndex) ||
    session.currentSetIndex < 0 ||
    session.currentSetIndex >= exerciseSets.length
  ) {
    throw new Error('série atual não encontrada');
  }
  return exerciseSets[session.currentSetIndex];
}

export function updateCurrentSet(
  session: GuidedSession,
  values: CurrentSetValues,
  updatedAtMs: number,
): GuidedSession {
  assertPhase(session, 'set');
  const currentSet = getCurrentSet(session);
  if (!currentSet) throw new Error('série atual não encontrada');

  return {
    ...session,
    updatedAtMs,
    sets: session.sets.map((set) => (isSameSet(set, currentSet) ? { ...set, ...values } : set)),
  };
}

export function completeCurrentSet(
  session: GuidedSession,
  day: GuidedSessionDay,
  completedAtMs: number,
): GuidedSession {
  assertPhase(session, 'set');
  const currentSet = getCurrentSet(session);
  if (!currentSet) throw new Error('série atual não encontrada');

  const completedSets = session.sets.map((set) =>
    isSameSet(set, currentSet) ? { ...set, completed: true } : set,
  );
  const exercise = getCurrentExercise(day, session);
  const isLastSet = session.currentSetIndex >= exercise.sets - 1;
  const isLastExercise = session.currentExerciseIndex >= day.exercises.length - 1;

  if (isLastSet && isLastExercise) {
    return {
      ...session,
      sets: completedSets,
      phase: 'ready-to-finish',
      restEndsAtMs: null,
      updatedAtMs: completedAtMs,
    };
  }

  if (isLastSet) {
    return {
      ...session,
      sets: completedSets,
      phase: 'exercise-complete',
      restEndsAtMs: null,
      updatedAtMs: completedAtMs,
    };
  }

  return {
    ...session,
    sets: completedSets,
    phase: 'rest',
    restEndsAtMs: completedAtMs + (exercise.restSeconds ?? 0) * 1_000,
    updatedAtMs: completedAtMs,
  };
}

export function extendRest(session: GuidedSession, updatedAtMs: number): GuidedSession {
  assertPhase(session, 'rest');
  if (session.restEndsAtMs === null) throw new Error('descanso sem horário de término');

  return {
    ...session,
    restEndsAtMs: session.restEndsAtMs + REST_EXTENSION_MS,
    updatedAtMs,
  };
}

export function skipRest(
  session: GuidedSession,
  day: GuidedSessionDay,
  updatedAtMs: number,
): GuidedSession {
  assertPhase(session, 'rest');
  const exercise = getCurrentExercise(day, session);
  if (session.currentSetIndex >= exercise.sets - 1) {
    throw new Error('não há próxima série neste descanso');
  }

  return {
    ...session,
    currentSetIndex: session.currentSetIndex + 1,
    phase: 'set',
    restEndsAtMs: null,
    updatedAtMs,
  };
}

export function continueAfterExercise(
  session: GuidedSession,
  day: GuidedSessionDay,
  updatedAtMs: number,
): GuidedSession {
  assertPhase(session, 'exercise-complete');
  if (session.currentExerciseIndex >= day.exercises.length - 1) {
    throw new Error('não há próximo exercício');
  }

  return {
    ...session,
    currentExerciseIndex: session.currentExerciseIndex + 1,
    currentSetIndex: 0,
    phase: 'set',
    restEndsAtMs: null,
    updatedAtMs,
  };
}

export function markSessionFinished(session: GuidedSession, finishedAtMs: number): GuidedSession {
  assertPhase(session, 'ready-to-finish');

  return {
    ...session,
    phase: 'summary',
    restEndsAtMs: null,
    updatedAtMs: finishedAtMs,
  };
}

export function buildSessionSummary(
  session: GuidedSession,
  finishedAtMs: number,
): GuidedSessionSummary {
  const completedSets = session.sets.filter((set) => set.completed);
  const exerciseIds = new Set(session.sets.map((set) => set.workoutExerciseId));
  const volumeKg = completedSets.reduce(
    (total, set) => total + parseNumber(set.loadKg) * parseNumber(set.repsDone),
    0,
  );
  const currentActiveDurationMs =
    session.activeSinceMs === null ? 0 : Math.max(0, finishedAtMs - session.activeSinceMs);
  const activeDurationMs = session.activeDurationMs + currentActiveDurationMs;

  return {
    durationMin: Math.min(600, Math.max(1, Math.ceil(activeDurationMs / 60_000))),
    exerciseCount: exerciseIds.size,
    completedSetCount: completedSets.length,
    volumeKg,
  };
}

function getCurrentExerciseId(session: GuidedSession): string {
  const exerciseIds = [...new Set(session.sets.map((set) => set.workoutExerciseId))];
  const exerciseId = exerciseIds[session.currentExerciseIndex];
  if (!exerciseId) throw new Error('exercício atual não encontrado');
  return exerciseId;
}

function getCurrentExercise(day: GuidedSessionDay, session: GuidedSession): GuidedSessionExercise {
  const exercise = day.exercises[session.currentExerciseIndex];
  if (!exercise) throw new Error('exercício atual não encontrado');
  return exercise;
}

function assertPhase(session: GuidedSession, phase: GuidedSessionPhase): void {
  if (session.phase !== phase) {
    throw new Error(`ação inválida na fase ${session.phase}; esperado ${phase}`);
  }
}

function isSameSet(left: WorkoutSetState, right: WorkoutSetState): boolean {
  return left.workoutExerciseId === right.workoutExerciseId && left.setNumber === right.setNumber;
}

function parseNumber(value: string): number {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}
