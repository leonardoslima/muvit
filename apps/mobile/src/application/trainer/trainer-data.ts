import type { studentSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export const TRAINER_STUDENTS_PAGE_SIZE = 25;

export type TrainerSummary = {
  students: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    newThisWeek: number;
  };
  workouts: {
    activePlans: number;
  };
  assessments: {
    last30d: number;
  };
};

export type TrainerStudent = z.infer<typeof studentSchema>;

export type TrainerStudentsPage = {
  items: TrainerStudent[];
  total: number;
};

export type ListTrainerStudentsInput = {
  q?: string;
  limit: number;
  offset: number;
  signal?: AbortSignal;
};

export function getTrainerSummary(
  api: ApiRequester,
  signal?: AbortSignal,
): Promise<TrainerSummary> {
  return api.request<TrainerSummary>('/trainer/summary', { signal });
}

export function listTrainerStudents(
  api: ApiRequester,
  input: ListTrainerStudentsInput,
): Promise<TrainerStudentsPage> {
  const normalizedQuery = input.q?.trim();
  const query = [
    normalizedQuery ? `q=${encodeURIComponent(normalizedQuery)}` : null,
    `limit=${input.limit}`,
    `offset=${input.offset}`,
  ]
    .filter((value): value is string => value !== null)
    .join('&');

  return api.request<TrainerStudentsPage>(`/students?${query}`, {
    signal: input.signal,
  });
}

export function getTrainerStudent(
  api: ApiRequester,
  studentId: string,
  signal?: AbortSignal,
): Promise<TrainerStudent> {
  return api.request<TrainerStudent>(`/students/${encodeURIComponent(studentId)}`, {
    signal,
  });
}
