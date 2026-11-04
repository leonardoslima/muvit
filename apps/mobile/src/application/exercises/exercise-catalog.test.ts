import { describe, expect, it, vi } from 'vitest';
import { EXERCISE_CATALOG_PAGE_SIZE, listExerciseCatalog } from './exercise-catalog';

describe('exercise-catalog', () => {
  it('lista scope all sem q ou grupo quando filtros estão vazios', async () => {
    const api = { request: vi.fn().mockResolvedValue({ items: [], total: 0 }) };

    await listExerciseCatalog(api, {
      q: '   ',
      limit: EXERCISE_CATALOG_PAGE_SIZE,
      offset: 0,
    });

    expect(api.request).toHaveBeenCalledWith('/exercises?scope=all&limit=50&offset=0', {
      signal: undefined,
    });
  });

  it('normaliza busca, aplica grupo e encaminha signal', async () => {
    const api = { request: vi.fn().mockResolvedValue({ items: [], total: 0 }) };
    const signal = new AbortController().signal;

    await listExerciseCatalog(api, {
      q: '  Supino reto  ',
      muscleGroup: 'chest',
      limit: 50,
      offset: 50,
      signal,
    });

    expect(api.request).toHaveBeenCalledWith(
      '/exercises?scope=all&q=Supino%20reto&muscleGroup=chest&limit=50&offset=50',
      { signal },
    );
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
  });
});
