import type { workoutPlanFullSchema, workoutPlanSummarySchema } from '@muvit/validators';
import type { z } from 'zod';

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

export function normalizeCachedTodayWorkout(data: unknown): TodayWorkoutResult {
  if (!data || typeof data !== 'object') return { status: 'no-active-plan' };

  if ('status' in data) {
    if (data.status === 'no-active-plan') return { status: 'no-active-plan' };
    if (data.status === 'available' && 'plan' in data && 'day' in data) {
      return {
        status: 'available',
        plan: data.plan as WorkoutPlan,
        day: data.day as WorkoutDay,
      };
    }
    if (data.status === 'no-workout-today' && 'plan' in data) {
      return { status: 'no-workout-today', plan: data.plan as WorkoutPlan };
    }
  }

  if ('plan' in data && 'day' in data) {
    return {
      status: 'available',
      plan: data.plan as WorkoutPlan,
      day: data.day as WorkoutDay,
    };
  }

  return { status: 'no-active-plan' };
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
  const completedDayIds = new Set(
    logs.filter((log) => log.completed).map((log) => log.workoutDayId),
  );
  return days.find((candidate) => !completedDayIds.has(candidate.id)) ?? days[0];
}

function selectWorkoutLogPlan(summaries: WorkoutPlanSummary[]): WorkoutPlanSummary | undefined {
  return summaries.find((plan) => plan.status === 'active') ?? summaries[0];
}
