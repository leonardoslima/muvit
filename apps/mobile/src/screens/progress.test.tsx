import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressScreen } from './progress';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ProgressScreen />
    </QueryClientProvider>,
  );

  return { ...rendered, queryClient };
}

function deferred<T>(): {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
} {
  let resolvePromise = (_value: T): void => undefined;
  let rejectPromise = (_error: unknown): void => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return { promise, reject: rejectPromise, resolve: resolvePromise };
}

beforeEach(() => {
  apiState.request.mockReset();
});

describe('ProgressScreen', () => {
  it('exibe carregamento enquanto busca as avaliações', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderWithQueryClient();

    expect(screen.getByText('Carregando progresso')).toBeTruthy();
    expect(screen.getByLabelText('Carregando progresso')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
  });

  it('permite tentar novamente depois de uma falha e exibe o vazio', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [], total: 0 });

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu progresso')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('prioriza carregamento no retry sem dados e bloqueia ações concorrentes', async () => {
    const retry = deferred<{ items: never[]; total: number }>();
    apiState.request.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    apiState.request.mockImplementation(() => retry.promise);

    const { queryClient } = renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu progresso')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
    const retryButton = screen.getByRole('button', { name: 'Tentar novamente' });
    act(() => {
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
    });

    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(queryClient.getQueryState(['assessments', 'me'])?.fetchStatus).toBe('fetching'),
    );
    expect(await screen.findByText('Carregando progresso')).toBeTruthy();
    expect(screen.queryByText('Não foi possível carregar seu progresso')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();

    await act(async () => retry.resolve({ items: [], total: 0 }));
    expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
  });

  it('exibe uma mensagem orientadora quando não há avaliações', async () => {
    apiState.request.mockResolvedValueOnce({
      items: [],
      total: 0,
    });

    renderWithQueryClient();

    expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
    expect(screen.getByText('Registre uma avaliação para acompanhar sua evolução.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
  });

  it('formata a data, agrupa peso e gordura e compara com a avaliação anterior', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 2,
      items: [
        {
          id: 'assessment-new',
          date: '2026-06-12',
          weightKg: 80,
          bodyFatPct: 19,
          notes: 'Evoluiu',
        },
        {
          id: 'assessment-previous',
          date: '2026-05-12',
          weightKg: 82,
          bodyFatPct: 21,
          notes: null,
        },
      ],
    });

    const { queryClient } = renderWithQueryClient();

    const card = await screen.findByTestId('assessment-card-assessment-new');
    expect(within(card).getByText('12/06/2026')).toBeTruthy();
    expect(within(card).getByText('80 kg')).toBeTruthy();
    expect(within(card).getByText('19% de gordura')).toBeTruthy();
    expect(within(card).getByText('2 kg a menos')).toBeTruthy();
    expect(within(card).getByText('2 p.p. a menos')).toBeTruthy();
    expect(within(card).getByText('Evoluiu')).toBeTruthy();
    expect(await screen.findByText('12/05/2026')).toBeTruthy();
    expect(screen.getAllByTestId(/^assessment-card-/).map((item) => item.props.testID)).toEqual([
      'assessment-card-assessment-new',
      'assessment-card-assessment-previous',
    ]);
    expect(apiState.request).toHaveBeenCalledExactlyOnceWith('/students/me/assessments?limit=20');
    expect(queryClient.getQueryData(['assessments', 'me'])).toMatchObject({ total: 2 });
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
  });

  it('exibe ganhos de peso e gordura como a mais', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 2,
      items: [
        {
          id: 'assessment-gain',
          date: '2026-06-12',
          weightKg: 82,
          bodyFatPct: 23,
          notes: null,
        },
        {
          id: 'assessment-before-gain',
          date: '2026-05-12',
          weightKg: 80,
          bodyFatPct: 21,
          notes: null,
        },
      ],
    });

    renderWithQueryClient();

    const card = await screen.findByTestId('assessment-card-assessment-gain');
    expect(within(card).getByText('2 kg a mais')).toBeTruthy();
    expect(within(card).getByText('2 p.p. a mais')).toBeTruthy();
  });

  it('preserva os valores neutros quando uma avaliação não tem medidas', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'assessment-without-measures',
          date: 'data não informada',
          weightKg: null,
          bodyFatPct: null,
          notes: null,
        },
      ],
    });

    renderWithQueryClient();

    const card = await screen.findByTestId('assessment-card-assessment-without-measures');
    expect(within(card).getByText('data não informada')).toBeTruthy();
    expect(within(card).getByText('— kg')).toBeTruthy();
    expect(within(card).getByText('—% de gordura')).toBeTruthy();
  });

  it('não compara com registro mais antigo quando a avaliação adjacente não tem medida', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 3,
      items: [
        {
          id: 'assessment-newest',
          date: '2026-10-14',
          weightKg: 80,
          bodyFatPct: null,
          notes: null,
        },
        {
          id: 'assessment-adjacent-without-measures',
          date: '2026-09-14',
          weightKg: null,
          bodyFatPct: null,
          notes: null,
        },
        {
          id: 'assessment-older',
          date: '2026-08-14',
          weightKg: 84,
          bodyFatPct: 22,
          notes: null,
        },
      ],
    });

    renderWithQueryClient();

    const newest = await screen.findByTestId('assessment-card-assessment-newest');
    expect(within(newest).queryByText(/kg a (mais|menos)/)).toBeNull();
    expect(within(newest).queryByText(/p\.p\. a (mais|menos)/)).toBeNull();
  });

  it('conserva o histórico e permite retry contextual após falha de atualização', async () => {
    const user = userEvent.setup();
    const refresh = deferred<{
      items: { id: string; date: string; weightKg: number }[];
      total: number;
    }>();
    apiState.request.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'assessment-kept',
          date: '2026-10-14',
          weightKg: 80,
          bodyFatPct: 19,
          notes: 'Histórico preservado',
        },
      ],
    });
    apiState.request.mockReturnValueOnce(refresh.promise);
    apiState.request.mockResolvedValueOnce({ total: 1, items: [] });

    const { queryClient } = renderWithQueryClient();
    const card = await screen.findByTestId('assessment-card-assessment-kept');
    expect(within(card).getByText('Histórico preservado')).toBeTruthy();

    act(() => {
      void queryClient.invalidateQueries({ queryKey: ['assessments', 'me'] });
    });
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    await act(async () => refresh.reject(new Error('offline')));

    expect(await screen.findByText('Não foi possível atualizar suas avaliações.')).toBeTruthy();
    expect(screen.getByTestId('assessment-card-assessment-kept')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
  });

  it('preserva a orientação vazia e inclui falha contextual ao atualizar sem registros', async () => {
    const refresh = deferred<{ items: never[]; total: number }>();
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });
    apiState.request.mockReturnValueOnce(refresh.promise);

    const { queryClient } = renderWithQueryClient();
    expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();

    act(() => {
      void queryClient.invalidateQueries({ queryKey: ['assessments', 'me'] });
    });
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    await act(async () => refresh.reject(new Error('offline')));

    expect(await screen.findByText('Não foi possível atualizar suas avaliações.')).toBeTruthy();
    expect(screen.getByText('Nenhuma avaliação registrada')).toBeTruthy();
    expect(screen.getByText('Registre uma avaliação para acompanhar sua evolução.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
  });
});
