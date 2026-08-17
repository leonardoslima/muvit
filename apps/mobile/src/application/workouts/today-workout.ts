import {
  workoutDayFullSchema,
  workoutPlanFullSchema,
  type workoutPlanSummarySchema,
} from '@muvit/validators';
import type { z } from 'zod';
import type { GuidedSession } from './guided-session';

type WorkoutPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];

type WorkoutApiClient = {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
};

type WorkoutLogSummary = {
  workoutDayId: string;
  completed: boolean;
};

export type TodayWorkoutResult =
  | {
      status: 'available';
      plan: WorkoutPlan;
      day: WorkoutDay;
    }
  | {
      status: 'no-active-plan';
    }
  | {
      status: 'no-workout-today';
      plan: WorkoutPlan;
    };

export type TodayWorkout = Extract<TodayWorkoutResult, { status: 'available' }>;

export function normalizeCachedTodayWorkout(data: unknown): TodayWorkoutResult | undefined {
  if (!isRecord(data)) return undefined;
  if (data.status === 'no-active-plan') return { status: 'no-active-plan' };

  if (data.status === 'no-workout-today' && 'plan' in data) {
    const plan = parseCachedPlan(data.plan);
    if (!plan || plan.days.some(isExecutableWorkoutDay)) return undefined;
    return { status: 'no-workout-today', plan };
  }

  if (data.status === 'available' && 'plan' in data && 'day' in data) {
    return parseCachedAvailable(data.plan, data.day);
  }

  if ('plan' in data && 'day' in data) return parseCachedAvailable(data.plan, data.day);

  return undefined;
}

export function estimateWorkoutDuration(day: WorkoutDay): number {
  const seconds = day.exercises.reduce(
    (total, exercise) => total + exercise.sets * (60 + (exercise.restSeconds ?? 0)),
    0,
  );
  return Math.max(1, Math.round(seconds / 60));
}

export async function loadWorkoutDay({
  api,
  dayId,
}: {
  api: WorkoutApiClient;
  dayId: string;
}): Promise<WorkoutDay> {
  const summaries = await api.request<{ items: WorkoutPlanSummary[] }>(
    '/students/me/workout-plans',
  );
  const selected = selectWorkoutLogPlan(summaries.items);
  if (!selected) throw new Error('sem plano');

  const plan = await api.request<WorkoutPlan>(`/workout-plans/${selected.id}`);
  const day = plan.days.find((candidate) => candidate.id === dayId);
  if (!day) throw new Error('dia não encontrado');
  return day;
}

export async function loadTodayWorkout({
  api,
}: {
  api: WorkoutApiClient;
}): Promise<TodayWorkoutResult> {
  const summaries = await api.request<{ items: WorkoutPlanSummary[] }>(
    '/students/me/workout-plans',
  );
  const active = summaries.items.find((plan) => plan.status === 'active');
  if (!active) return { status: 'no-active-plan' };

  const [plan, logs] = await Promise.all([
    api.request<WorkoutPlan>(`/workout-plans/${active.id}`),
    api.request<{ items: WorkoutLogSummary[] }>('/students/me/workout-logs?limit=30'),
  ]);

  const day = selectNextWorkoutDay(plan.days, logs.items);
  if (!day) return { status: 'no-workout-today', plan };

  return { status: 'available', plan, day };
}

export function selectNextWorkoutDay(
  days: WorkoutDay[],
  logs: WorkoutLogSummary[],
): WorkoutDay | undefined {
  const executableDays = days.filter(isExecutableWorkoutDay);
  if (executableDays.length === 0) return undefined;

  const completedDayIds = new Set(
    logs.filter((log) => log.completed).map((log) => log.workoutDayId),
  );
  return (
    executableDays.find((candidate) => !completedDayIds.has(candidate.id)) ?? executableDays[0]
  );
}

export type WorkoutDraftProgress = {
  completedExerciseCount: number;
  totalExerciseCount: number;
  progressPercent: number;
  next: {
    exerciseName: string;
    setNumber: number;
    totalSets: number;
  } | null;
};

export function getWorkoutDraftProgress(
  day: WorkoutDay,
  session: GuidedSession,
): WorkoutDraftProgress {
  const completedExerciseCount = day.exercises.filter((exercise) =>
    isExerciseComplete(exercise, session),
  ).length;
  const totalExerciseCount = day.exercises.length;
  const progressPercent =
    totalExerciseCount === 0 ? 0 : Math.round((completedExerciseCount / totalExerciseCount) * 100);

  return {
    completedExerciseCount,
    totalExerciseCount,
    progressPercent,
    next: findNextWorkoutStep(day, session),
  };
}

function selectWorkoutLogPlan(summaries: WorkoutPlanSummary[]): WorkoutPlanSummary | undefined {
  return summaries.find((plan) => plan.status === 'active') ?? summaries[0];
}

function parseCachedPlan(value: unknown): WorkoutPlan | undefined {
  const parsed = workoutPlanFullSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseCachedAvailable(planValue: unknown, dayValue: unknown): TodayWorkout | undefined {
  const plan = parseCachedPlan(planValue);
  const parsedDay = workoutDayFullSchema.safeParse(dayValue);
  if (!plan || !parsedDay.success || parsedDay.data.planId !== plan.id) return undefined;

  const day = plan.days.find((candidate) => candidate.id === parsedDay.data.id);
  if (!day) return undefined;
  return { status: 'available', plan, day };
}

function isExecutableWorkoutDay(day: WorkoutDay): boolean {
  return day.exercises.some((exercise) => exercise.sets >= 1);
}

function isExerciseComplete(
  exercise: WorkoutDay['exercises'][number],
  session: GuidedSession,
): boolean {
  const sets = session.sets.filter((set) => set.workoutExerciseId === exercise.id);
  return (
    sets.length >= exercise.sets &&
    Array.from({ length: exercise.sets }, (_, index) => index + 1).every((setNumber) =>
      sets.some((set) => set.setNumber === setNumber && set.completed),
    )
  );
}

function findNextWorkoutStep(
  day: WorkoutDay,
  session: GuidedSession,
): WorkoutDraftProgress['next'] {
  let preferredExerciseIndex = session.currentExerciseIndex;
  let preferredSetIndex = session.currentSetIndex;

  if (session.phase === 'exercise-complete') {
    preferredExerciseIndex += 1;
    preferredSetIndex = 0;
  }
  if (session.phase === 'rest') preferredSetIndex += 1;
  if (session.phase === 'ready-to-finish' || session.phase === 'summary') {
    preferredExerciseIndex = 0;
    preferredSetIndex = 0;
  }

  const preferred = findIncompleteStep(day, session, preferredExerciseIndex, preferredSetIndex);
  return preferred ?? findIncompleteStep(day, session, 0, 0);
}

function findIncompleteStep(
  day: WorkoutDay,
  session: GuidedSession,
  startExerciseIndex: number,
  startSetIndex: number,
): WorkoutDraftProgress['next'] {
  for (
    let exerciseIndex = Math.max(0, startExerciseIndex);
    exerciseIndex < day.exercises.length;
    exerciseIndex += 1
  ) {
    const exercise = day.exercises[exerciseIndex];
    const firstSetIndex = exerciseIndex === startExerciseIndex ? Math.max(0, startSetIndex) : 0;
    const sets = session.sets.filter((set) => set.workoutExerciseId === exercise.id);

    for (let setIndex = firstSetIndex; setIndex < exercise.sets; setIndex += 1) {
      const set = sets.find((candidate) => candidate.setNumber === setIndex + 1);
      if (!set?.completed) {
        return {
          exerciseName: exercise.exercise.name,
          setNumber: setIndex + 1,
          totalSets: exercise.sets,
        };
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
