import { exerciseSchema } from '@muvit/validators';
import type { ApiRequester } from '../../lib/api';
import { EXERCISE_CATALOG_PAGE_SIZE, listExerciseCatalog } from './exercise-catalog';

export type SessionExerciseMedia =
  | { kind: 'available'; uri: string; format: 'video' | 'gif' }
  | { kind: 'missing' };

type CatalogPage = { items: unknown[]; total: number };

export async function loadSessionExerciseMedia(
  api: ApiRequester,
  exerciseId: string,
  signal?: AbortSignal,
): Promise<SessionExerciseMedia> {
  let offset = 0;

  while (true) {
    signal?.throwIfAborted();
    const page = parseCatalogPage(
      await listExerciseCatalog(api, {
        limit: EXERCISE_CATALOG_PAGE_SIZE,
        offset,
        signal,
      }),
    );
    signal?.throwIfAborted();

    for (const rawExercise of page.items) {
      const exerciseToValidate =
        isRecord(rawExercise) && !Object.prototype.hasOwnProperty.call(rawExercise, 'videoUrl')
          ? { ...rawExercise, videoUrl: null }
          : rawExercise;
      const exercise = exerciseSchema.parse(exerciseToValidate);
      if (exercise.id !== exerciseId) continue;
      if (!exercise.videoUrl) return { kind: 'missing' };

      const pathname = new URL(exercise.videoUrl).pathname;
      return {
        kind: 'available',
        uri: exercise.videoUrl,
        format: pathname.toLocaleLowerCase().endsWith('.gif') ? 'gif' : 'video',
      };
    }

    if (page.items.length === 0 || offset + page.items.length >= page.total) {
      return { kind: 'missing' };
    }
    offset += page.items.length;
  }
}

function parseCatalogPage(value: unknown): CatalogPage {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error('Resposta inválida do catálogo de exercícios.');
  }

  const total = value.total;
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 0) {
    throw new Error('Resposta inválida do catálogo de exercícios.');
  }

  return { items: value.items, total };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
