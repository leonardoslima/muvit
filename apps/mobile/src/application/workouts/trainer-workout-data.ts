import type {
  PublishWorkoutPlanDraftInput,
  SaveWorkoutPlanDraftInput,
  WorkoutPlanDraft,
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  workoutPlanFullSchema,
  workoutPlanSummarySchema,
} from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export type TrainerWorkoutPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
export type TrainerWorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
export type CreateTrainerWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateTrainerWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;
export type TrainerWorkoutPlanDraft = WorkoutPlanDraft;

export function trainerWorkoutDraftQueryKey(authUserId: string, studentId: string) {
  return ['trainer-workout-drafts', authUserId, studentId] as const;
}

export function listTrainerWorkoutPlans(
  api: ApiRequester,
  studentId: string,
  signal?: AbortSignal,
): Promise<{ items: TrainerWorkoutPlanSummary[] }> {
  return api.request<{ items: TrainerWorkoutPlanSummary[] }>(
    `/students/${encodeURIComponent(studentId)}/workout-plans`,
    { signal },
  );
}

export function getTrainerWorkoutPlan(
  api: ApiRequester,
  planId: string,
  signal?: AbortSignal,
): Promise<TrainerWorkoutPlan> {
  return api.request<TrainerWorkoutPlan>(`/workout-plans/${encodeURIComponent(planId)}`, {
    signal,
  });
}

export function createTrainerWorkoutPlan(
  api: ApiRequester,
  input: CreateTrainerWorkoutPlanInput,
): Promise<TrainerWorkoutPlan> {
  return api.request<TrainerWorkoutPlan>('/workout-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTrainerWorkoutPlan(
  api: ApiRequester,
  planId: string,
  input: UpdateTrainerWorkoutPlanInput,
): Promise<TrainerWorkoutPlan> {
  return api.request<TrainerWorkoutPlan>(`/workout-plans/${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listTrainerWorkoutDrafts(
  api: ApiRequester,
  studentId: string,
  signal?: AbortSignal,
): Promise<{ items: TrainerWorkoutPlanDraft[] }> {
  return api.request<{ items: TrainerWorkoutPlanDraft[] }>(
    `/students/${encodeURIComponent(studentId)}/workout-plan-drafts`,
    { signal },
  );
}

export function getTrainerWorkoutDraft(
  api: ApiRequester,
  draftId: string,
  signal?: AbortSignal,
): Promise<TrainerWorkoutPlanDraft> {
  return api.request<TrainerWorkoutPlanDraft>(
    `/workout-plan-drafts/${encodeURIComponent(draftId)}`,
    { signal },
  );
}

export function saveTrainerWorkoutDraft(
  api: ApiRequester,
  input: SaveWorkoutPlanDraftInput,
): Promise<TrainerWorkoutPlanDraft> {
  return api.request<TrainerWorkoutPlanDraft>('/workout-plan-drafts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function publishTrainerWorkoutDraft(
  api: ApiRequester,
  draftId: string,
  input: PublishWorkoutPlanDraftInput,
): Promise<TrainerWorkoutPlan> {
  return api.request<TrainerWorkoutPlan>(
    `/workout-plan-drafts/${encodeURIComponent(draftId)}/publish`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}
