import {
  workoutDayFullSchema,
  workoutLogSummarySchema,
  workoutPlanFullSchema,
  workoutPlanSummarySchema,
} from '@muvit/validators';
import { z } from 'zod';
import { ApiTransportError } from '../../lib/api';
import type { GuidedSession } from './guided-session';

type WorkoutPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];
type WorkoutLogSummary = z.infer<typeof workoutLogSummarySchema>;
type WorkoutLogSelection = Pick<WorkoutLogSummary, 'workoutDayId' | 'completed'>;

const workoutPlanSummariesResponseSchema = z.object({
  items: z.array(workoutPlanSummarySchema),
});
const workoutLogSummariesResponseSchema = z.object({
  items: z.array(workoutLogSummarySchema),
});

type WorkoutApiClient = {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
};

type TodayWorkoutCacheStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
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

export class InvalidTodayWorkoutPayloadError extends Error {
  readonly code = 'invalid-today-workout-payload' as const;

  constructor() {
    super('Resposta online do treino inválida.');
    this.name = 'InvalidTodayWorkoutPayloadError';
  }
}

export function normalizeOnlineTodayWorkout(data: unknown): TodayWorkoutResult {
  const normalized = normalizeCachedTodayWorkout(data);
  if (!normalized) throw new InvalidTodayWorkoutPayloadError();
  return normalized;
}

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

  if ('status' in data) return undefined;
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
  const summaries = parseOnlinePayload(
    workoutPlanSummariesResponseSchema,
    await api.request<unknown>('/students/me/workout-plans'),
  );
  const selected = selectWorkoutLogPlan(summaries.items);
  if (!selected) throw new Error('sem plano');

  const plan = parseOnlineWorkoutPlan(await api.request<unknown>(`/workout-plans/${selected.id}`));
  const day = plan.days.find((candidate) => candidate.id === dayId);
  if (!day) throw new Error('dia não encontrado');
  if (!isExecutableWorkoutDay(day)) throw new Error('dia não executável');
  return day;
}

export async function loadTodayWorkout({
  api,
}: {
  api: WorkoutApiClient;
}): Promise<TodayWorkoutResult> {
  const summaries = parseOnlinePayload(
    workoutPlanSummariesResponseSchema,
    await api.request<unknown>('/students/me/workout-plans'),
  );
  const active = summaries.items.find((plan) => plan.status === 'active');
  if (!active) return { status: 'no-active-plan' };

  const [planPayload, logsPayload] = await Promise.all([
    api.request<unknown>(`/workout-plans/${active.id}`),
    api.request<unknown>('/students/me/workout-logs?limit=30'),
  ]);
  const plan = parseOnlineWorkoutPlan(planPayload);
  const logs = parseOnlinePayload(workoutLogSummariesResponseSchema, logsPayload);

  const day = selectNextWorkoutDay(plan.days, logs.items);
  if (!day) return { status: 'no-workout-today', plan };

  return { status: 'available', plan, day };
}

export async function loadTodayWorkoutWithOfflineFallback({
  api,
  authUserId,
  storage,
}: {
  api: WorkoutApiClient;
  authUserId: string;
  storage: TodayWorkoutCacheStorage;
}): Promise<{ data: TodayWorkoutResult; stale: boolean }> {
  let online: TodayWorkoutResult;
  try {
    online = normalizeOnlineTodayWorkout(await loadTodayWorkout({ api }));
  } catch (error) {
    if (!(error instanceof ApiTransportError)) throw error;

    const serialized = await storage.getItem(`today-workout:${authUserId}`);
    if (!serialized) throw error;

    const data = normalizeCachedTodayWorkout(JSON.parse(serialized));
    if (!data) throw new Error('Cache do treino inválido.');
    return { data, stale: true };
  }

  await storage.setItem(`today-workout:${authUserId}`, JSON.stringify(online));
  return { data: online, stale: false };
}

export function selectNextWorkoutDay(
  days: WorkoutDay[],
  logs: WorkoutLogSelection[],
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
  const executableExercises = day.exercises.filter(isExecutableWorkoutExercise);
  const completedExerciseCount = executableExercises.filter((exercise) =>
    isExerciseComplete(exercise, session),
  ).length;
  const totalExerciseCount = executableExercises.length;
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
  return parseWorkoutPlan(value);
}

function parseCachedAvailable(planValue: unknown, dayValue: unknown): TodayWorkout | undefined {
  const plan = parseCachedPlan(planValue);
  const parsedDay = workoutDayFullSchema.safeParse(dayValue);
  if (!plan || !parsedDay.success || !isValidWorkoutDay(parsedDay.data, plan.id)) {
    return undefined;
  }

  const day = plan.days.find((candidate) => candidate.id === parsedDay.data.id);
  if (!day || !isExecutableWorkoutDay(day)) return undefined;
  return { status: 'available', plan, day };
}

function parseWorkoutPlan(value: unknown): WorkoutPlan | undefined {
  const parsed = workoutPlanFullSchema.safeParse(value);
  if (!parsed.success) return undefined;
  if (!parsed.data.days.every((day) => isValidWorkoutDay(day, parsed.data.id))) {
    return undefined;
  }
  return parsed.data;
}

function parseOnlineWorkoutPlan(value: unknown): WorkoutPlan {
  const plan = parseWorkoutPlan(value);
  if (!plan) throw new InvalidTodayWorkoutPayloadError();
  return plan;
}

function parseOnlinePayload<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown,
): z.output<TSchema> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new InvalidTodayWorkoutPayloadError();
  return parsed.data;
}

function isValidWorkoutDay(day: WorkoutDay, planId: string): boolean {
  return (
    day.planId === planId && day.exercises.every((exercise) => exercise.workoutDayId === day.id)
  );
}

function isExecutableWorkoutDay(day: WorkoutDay): boolean {
  return day.exercises.some(isExecutableWorkoutExercise);
}

function isExecutableWorkoutExercise(exercise: WorkoutDay['exercises'][number]): boolean {
  return exercise.sets >= 1;
}

function isExerciseComplete(
  exercise: WorkoutDay['exercises'][number],
  session: GuidedSession,
): boolean {
  if (!isExecutableWorkoutExercise(exercise)) return false;
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
  for (const exercise of day.exercises) {
    if (!isExecutableWorkoutExercise(exercise)) continue;
    const sets = session.sets.filter((set) => set.workoutExerciseId === exercise.id);

    for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
      const completed = sets.some((set) => set.setNumber === setNumber && set.completed);
      if (!completed) {
        return {
          exerciseName: exercise.exercise.name,
          setNumber,
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
