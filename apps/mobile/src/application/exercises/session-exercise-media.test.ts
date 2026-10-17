import { describe, expect, it } from 'vitest';
import { ApiClient } from '../../lib/api';
import { EXERCISE_CATALOG_PAGE_SIZE } from './exercise-catalog';
import { loadSessionExerciseMedia } from './session-exercise-media';

type PageResponse = { items: unknown[]; total: number };
type ResponseHandler = (url: URL, init?: RequestInit) => Promise<unknown> | unknown;

function exercise(
  index: number,
  options: { name?: string; videoUrl?: string | null } = {},
): Record<string, unknown> {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    trainerId: null,
    name: options.name ?? `Exercício ${index}`,
    muscleGroup: 'chest',
    equipment: null,
    videoUrl: options.videoUrl ?? null,
    instructions: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function createApi(handler: ResponseHandler) {
  const calls: Array<{ url: URL; signal: AbortSignal | null | undefined }> = [];
  const api = new ApiClient({
    baseUrl: 'https://api.muvit.test',
    getCookie: () => 'session=student',
    onUnauthorized: () => undefined,
    fetcher: async (input, init) => {
      const url = new URL(input);
      calls.push({ url, signal: init?.signal });
      return new Response(JSON.stringify(await handler(url, init)), { status: 200 });
    },
  });
  return { api, calls };
}

describe('loadSessionExerciseMedia', () => {
  it('retorna sem mídia com AbortSignal do React Native que não implementa throwIfAborted', async () => {
    const controller = new AbortController();
    Object.defineProperty(controller.signal, 'throwIfAborted', { value: undefined });
    const { api, calls } = createApi(() => ({ items: [exercise(3)], total: 1 }));
    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000003', controller.signal),
    ).resolves.toEqual({ kind: 'missing' });
    expect(calls).toHaveLength(1);
  });

  it('interrompe antes da próxima página com sinal nativo cancelado sem throwIfAborted', async () => {
    const controller = new AbortController();
    Object.defineProperty(controller.signal, 'throwIfAborted', { value: undefined });
    const { api, calls } = createApi(() => {
      controller.abort();
      return { items: [exercise(1)], total: 100 };
    });
    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000003', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toHaveLength(1);
  });

  it('paginates by ID and returns an exact match on the second catalog page', async () => {
    const targetId = '00000000-0000-4000-8000-000000000051';
    const firstPage = Array.from({ length: EXERCISE_CATALOG_PAGE_SIZE }, (_, index) =>
      exercise(index + 1),
    );
    const { api, calls } = createApi((url) =>
      url.searchParams.get('offset') === '0'
        ? { items: firstPage, total: EXERCISE_CATALOG_PAGE_SIZE + 1 }
        : { items: [exercise(51, { videoUrl: 'https://cdn.muvit.test/supino.mp4' })], total: 51 },
    );

    await expect(loadSessionExerciseMedia(api, targetId)).resolves.toEqual({
      kind: 'available',
      uri: 'https://cdn.muvit.test/supino.mp4',
      format: 'video',
    });
    expect(calls.map(({ url }) => url.searchParams.get('offset'))).toEqual(['0', '50']);
  });

  it('does not select an exercise with a matching name and a different ID', async () => {
    const { api } = createApi(() => ({
      items: [exercise(2, { name: 'Supino reto', videoUrl: 'https://cdn.muvit.test/supino.mp4' })],
      total: 1,
    }));

    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000001'),
    ).resolves.toEqual({
      kind: 'missing',
    });
  });

  it('returns missing for an absent exercise or a matching exercise without a URL', async () => {
    const absent = createApi(() => ({ items: [], total: 0 }));
    const withoutUrl = createApi(() => ({ items: [exercise(3)], total: 1 }));

    await expect(
      loadSessionExerciseMedia(absent.api, '00000000-0000-4000-8000-000000000003'),
    ).resolves.toEqual({ kind: 'missing' });
    await expect(
      loadSessionExerciseMedia(withoutUrl.api, '00000000-0000-4000-8000-000000000003'),
    ).resolves.toEqual({ kind: 'missing' });
  });

  it('returns missing when the matching exercise omits videoUrl', async () => {
    const { videoUrl: omittedVideoUrl, ...missingVideoUrl } = exercise(8);
    expect(omittedVideoUrl).toBeNull();
    const { api } = createApi(() => ({ items: [missingVideoUrl], total: 1 }));

    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000008'),
    ).resolves.toEqual({ kind: 'missing' });
  });

  it('stops when a page is empty even if the catalog total is larger', async () => {
    const { api, calls } = createApi(() => ({ items: [], total: 100 }));

    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000004'),
    ).resolves.toEqual({ kind: 'missing' });
    expect(calls).toHaveLength(1);
  });

  it('rejects an invalid catalog item rather than hiding a payload error as missing media', async () => {
    const { api } = createApi(() => ({
      items: [
        {
          ...exercise(5, { videoUrl: 'https://cdn.muvit.test/supino.mp4' }),
          muscleGroup: 'unknown',
        },
      ],
      total: 1,
    }));

    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000005'),
    ).rejects.toThrow();
  });

  it.each([
    ['items não é uma lista', { items: 'inválido', total: 0 }],
    ['total não é inteiro', { items: [], total: 1.5 }],
    ['total é negativo', { items: [], total: -1 }],
  ])('rejeita uma página quando %s', async (_caseName, page) => {
    const { api } = createApi(() => page);

    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000009'),
    ).rejects.toThrow('Resposta inválida do catálogo de exercícios.');
  });

  it('passes the abort signal through to the catalog request and propagates cancellation', async () => {
    const controller = new AbortController();
    const { api, calls } = createApi((_url, init) => {
      return new Promise<PageResponse>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    const pending = loadSessionExerciseMedia(
      api,
      '00000000-0000-4000-8000-000000000006',
      controller.signal,
    );

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls[0]?.signal).toBe(controller.signal);
  });

  it('recognizes a GIF pathname when the URL includes a query string', async () => {
    const { api } = createApi(() => ({
      items: [exercise(7, { videoUrl: 'https://cdn.muvit.test/movimento.GIF?token=x' })],
      total: 1,
    }));

    await expect(
      loadSessionExerciseMedia(api, '00000000-0000-4000-8000-000000000007'),
    ).resolves.toEqual({
      kind: 'available',
      uri: 'https://cdn.muvit.test/movimento.GIF?token=x',
      format: 'gif',
    });
  });
});
