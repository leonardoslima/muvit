import type { assessmentSchema, createAssessmentSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export const TRAINER_ASSESSMENTS_PAGE_SIZE = 25;

export type Assessment = z.infer<typeof assessmentSchema>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export type AssessmentsPage = {
  items: Assessment[];
  total: number;
};

export type AssessmentTarget = { kind: 'self' } | { kind: 'student'; studentId: string };

export type ListAssessmentsInput = {
  limit: number;
  offset: number;
  signal?: AbortSignal;
};

function assessmentsPath(target: AssessmentTarget): string {
  if (target.kind === 'self') {
    return '/students/me/assessments';
  }

  return `/students/${encodeURIComponent(target.studentId)}/assessments`;
}

export function listAssessments(
  api: ApiRequester,
  target: AssessmentTarget,
  input: ListAssessmentsInput,
): Promise<AssessmentsPage> {
  const path = assessmentsPath(target);
  return api.request<AssessmentsPage>(`${path}?limit=${input.limit}&offset=${input.offset}`, {
    signal: input.signal,
  });
}

export function getAssessment(
  api: ApiRequester,
  assessmentId: string,
  signal?: AbortSignal,
): Promise<Assessment> {
  return api.request<Assessment>(`/assessments/${encodeURIComponent(assessmentId)}`, { signal });
}

export function createAssessment(
  api: ApiRequester,
  target: AssessmentTarget,
  input: CreateAssessmentInput,
): Promise<Assessment> {
  return api.request<Assessment>(assessmentsPath(target), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
