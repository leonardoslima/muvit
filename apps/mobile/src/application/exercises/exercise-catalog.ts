import type { exerciseSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export const EXERCISE_CATALOG_PAGE_SIZE = 50;

export type Exercise = z.infer<typeof exerciseSchema>;

export type ExerciseCatalogPage = {
  items: Exercise[];
  total: number;
};

export type ListExerciseCatalogInput = {
  q?: string;
  muscleGroup?: Exercise['muscleGroup'];
  limit: number;
  offset: number;
  signal?: AbortSignal;
};

export function listExerciseCatalog(
  api: ApiRequester,
  input: ListExerciseCatalogInput,
): Promise<ExerciseCatalogPage> {
  const normalizedQuery = input.q?.trim();
  const query = [
    'scope=all',
    normalizedQuery ? `q=${encodeURIComponent(normalizedQuery)}` : null,
    input.muscleGroup ? `muscleGroup=${encodeURIComponent(input.muscleGroup)}` : null,
    `limit=${input.limit}`,
    `offset=${input.offset}`,
  ]
    .filter((value): value is string => value !== null)
    .join('&');

  return api.request<ExerciseCatalogPage>(`/exercises?${query}`, {
    signal: input.signal,
  });
}
