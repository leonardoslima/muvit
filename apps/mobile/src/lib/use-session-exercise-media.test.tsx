import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionExerciseMedia } from './use-session-exercise-media';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const networkState = vi.hoisted(() => ({
  value: { isConnected: true as boolean | null, isInternetReachable: true as boolean | null },
}));

vi.mock('../lib/use-api', () => ({ useApiClient: () => apiState }));
vi.mock('expo-network', () => ({ useNetworkState: () => networkState.value }));

const firstExercise = {
  id: '11111111-1111-4111-8111-111111111111',
  trainerId: null,
  name: 'Supino reto',
  muscleGroup: 'chest',
  equipment: null,
  videoUrl: 'https://media.example/supino.mp4',
  instructions: null,
  createdAt: '2026-10-14T12:00:00.000Z',
};
const secondExercise = {
  ...firstExercise,
  id: '22222222-2222-4222-8222-222222222222',
  videoUrl: 'https://media.example/remada.gif?token=private',
};

type HookProps = {
  authUserId?: string;
  dayId?: string;
  exerciseId?: string;
  enabled: boolean;
};

function renderMediaHook(initialProps: HookProps) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  const hook = renderHook((props: HookProps) => useSessionExerciseMedia(props), {
    initialProps,
    wrapper: Wrapper,
  });
  return { ...hook, queryClient };
}

describe('useSessionExerciseMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    networkState.value = { isConnected: true, isInternetReachable: true };
  });

  it('não consulta offline e inicia a busca quando a conectividade retorna', async () => {
    networkState.value = { isConnected: false, isInternetReachable: false };
    apiState.request.mockResolvedValue({ items: [firstExercise], total: 1 });
    const hook = renderMediaHook({
      authUserId: 'user-a',
      dayId: 'day-a',
      exerciseId: firstExercise.id,
      enabled: true,
    });

    expect(hook.result.current.offline).toBe(true);
    expect(hook.result.current.isLoading).toBe(false);
    expect(apiState.request).not.toHaveBeenCalled();

    networkState.value = { isConnected: true, isInternetReachable: true };
    act(() =>
      hook.rerender({
        authUserId: 'user-a',
        dayId: 'day-a',
        exerciseId: firstExercise.id,
        enabled: true,
      }),
    );
    await waitFor(() => expect(hook.result.current.data).toMatchObject({ kind: 'available' }));
    expect(apiState.request).toHaveBeenCalledOnce();
  });

  it('isola os dados por aluno, dia e exercício', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [firstExercise], total: 1 })
      .mockResolvedValueOnce({ items: [secondExercise], total: 1 });
    const hook = renderMediaHook({
      authUserId: 'user-a',
      dayId: 'day-a',
      exerciseId: firstExercise.id,
      enabled: true,
    });

    await waitFor(() =>
      expect(hook.result.current.data).toEqual({
        kind: 'available',
        uri: firstExercise.videoUrl,
        format: 'video',
      }),
    );
    act(() =>
      hook.rerender({
        authUserId: 'user-b',
        dayId: 'day-b',
        exerciseId: secondExercise.id,
        enabled: true,
      }),
    );
    expect(hook.result.current.data).toBeUndefined();
    await waitFor(() =>
      expect(hook.result.current.data).toEqual({
        kind: 'available',
        uri: secondExercise.videoUrl,
        format: 'gif',
      }),
    );
    expect(apiState.request.mock.calls).toHaveLength(2);
  });

  it('cancela a consulta pendente quando a identidade e o contexto mudam', async () => {
    let originalSignal: AbortSignal | undefined;
    apiState.request
      .mockImplementationOnce(
        (_path: string, options?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            originalSignal = options?.signal;
            options?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce({ items: [secondExercise], total: 1 });
    const hook = renderMediaHook({
      authUserId: 'user-a',
      dayId: 'day-a',
      exerciseId: firstExercise.id,
      enabled: true,
    });

    try {
      await waitFor(() => expect(apiState.request).toHaveBeenCalledOnce());
      expect(originalSignal?.aborted).toBe(false);

      act(() =>
        hook.rerender({
          authUserId: 'user-b',
          dayId: 'day-b',
          exerciseId: secondExercise.id,
          enabled: true,
        }),
      );

      await waitFor(() => expect(originalSignal?.aborted).toBe(true));
      await waitFor(() =>
        expect(hook.result.current.data).toEqual({
          kind: 'available',
          uri: secondExercise.videoUrl,
          format: 'gif',
        }),
      );
      expect(apiState.request).toHaveBeenCalledTimes(2);
    } finally {
      hook.unmount();
    }
  });

  it('ignora respostas atrasadas ao voltar de A para B e novamente para A', async () => {
    type CatalogResponse = { items: unknown[]; total: number };
    const pendingRequests: Array<{
      signal?: AbortSignal;
      resolve: (response: CatalogResponse) => void;
    }> = [];
    const oldExerciseA = {
      ...firstExercise,
      videoUrl: 'https://media.example/supino-antigo.mp4',
    };
    const currentExerciseA = {
      ...firstExercise,
      videoUrl: 'https://media.example/supino-atual.mp4',
    };
    apiState.request.mockImplementation(
      (_path: string, options?: { signal?: AbortSignal }) =>
        new Promise<CatalogResponse>((resolve) => {
          pendingRequests.push({ signal: options?.signal, resolve });
        }),
    );
    const hook = renderMediaHook({
      authUserId: 'user-a',
      dayId: 'day-a',
      exerciseId: firstExercise.id,
      enabled: true,
    });

    try {
      await waitFor(() => expect(pendingRequests).toHaveLength(1));

      act(() =>
        hook.rerender({
          authUserId: 'user-b',
          dayId: 'day-b',
          exerciseId: secondExercise.id,
          enabled: true,
        }),
      );
      await waitFor(() => expect(pendingRequests).toHaveLength(2));

      act(() =>
        hook.rerender({
          authUserId: 'user-a',
          dayId: 'day-a',
          exerciseId: firstExercise.id,
          enabled: true,
        }),
      );
      await waitFor(() => expect(pendingRequests).toHaveLength(3));
      expect(pendingRequests[0]?.signal?.aborted).toBe(true);
      expect(pendingRequests[1]?.signal?.aborted).toBe(true);

      await act(async () => {
        pendingRequests[2]?.resolve({ items: [currentExerciseA], total: 1 });
      });
      await waitFor(() =>
        expect(hook.result.current.data).toEqual({
          kind: 'available',
          uri: currentExerciseA.videoUrl,
          format: 'video',
        }),
      );

      await act(async () => {
        pendingRequests[1]?.resolve({ items: [secondExercise], total: 1 });
        pendingRequests[0]?.resolve({ items: [oldExerciseA], total: 1 });
      });

      expect(hook.result.current.data).toEqual({
        kind: 'available',
        uri: currentExerciseA.videoUrl,
        format: 'video',
      });
    } finally {
      hook.unmount();
    }
  });

  it('não busca sem contexto válido e permite retry único após falha', async () => {
    apiState.request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      items: [firstExercise],
      total: 1,
    });
    const hook = renderMediaHook({
      authUserId: undefined,
      dayId: 'day-a',
      exerciseId: firstExercise.id,
      enabled: true,
    });
    expect(apiState.request).not.toHaveBeenCalled();

    act(() =>
      hook.rerender({
        authUserId: 'user-a',
        dayId: 'day-a',
        exerciseId: firstExercise.id,
        enabled: true,
      }),
    );
    await waitFor(() => expect(hook.result.current.error).toBeInstanceOf(Error));
    act(() => {
      hook.result.current.retry();
      hook.result.current.retry();
    });
    await waitFor(() => expect(hook.result.current.data).toMatchObject({ kind: 'available' }));
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });
});
