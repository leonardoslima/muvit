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

export type TodayWorkout = {
  plan: WorkoutPlan;
  day: WorkoutDay;
};

export async function loadWorkoutDay({
  api,
  userId,
  dayId,
}: {
  api: WorkoutApiClient;
  userId: string;
  dayId: string;
}): Promise<WorkoutDay> {
  const summaries = await api.request<{ items: WorkoutPlanSummary[] }>(
    `/students/${userId}/workout-plans`,
  );
  const selected = selectWorkoutLogPlan(summaries.items);
  if (!selected) throw new Error('sem plano');

  const plan = await api.request<WorkoutPlan>(`/workout-plans/${selected.id}`);
  const day = plan.days.find((candidate) => candidate.id === dayId);
  if (!day) throw new Error('dia nao encontrado');
  return day;
}

export async function loadTodayWorkout({
  api,
  userId,
}: {
  api: WorkoutApiClient;
  userId: string;
}): Promise<TodayWorkout | null> {
  const summaries = await api.request<{ items: WorkoutPlanSummary[] }>(
    `/students/${userId}/workout-plans`,
  );
  const active = summaries.items.find((plan) => plan.status === 'active');
  if (!active) return null;

  const [plan, logs] = await Promise.all([
    api.request<WorkoutPlan>(`/workout-plans/${active.id}`),
    api.request<{ items: WorkoutLogSummary[] }>(`/students/${userId}/workout-logs?limit=30`),
  ]);

  const day = selectNextWorkoutDay(plan.days, logs.items);
  return day ? { plan, day } : null;
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
