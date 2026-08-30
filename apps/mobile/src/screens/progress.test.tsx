import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
  return render(
    <QueryClientProvider client={queryClient}>
      <ProgressScreen />
    </QueryClientProvider>,
  );
}

describe('ProgressScreen', () => {
  it('exibe carregamento enquanto busca as avaliações', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderWithQueryClient();

    expect(screen.getByText('Carregando progresso')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('permite tentar novamente depois de uma falha e exibe o vazio', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [], total: 0 });

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu progresso')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('exibe uma mensagem orientadora quando não há avaliações', async () => {
    apiState.request.mockResolvedValueOnce({
      items: [],
      total: 0,
    });

    renderWithQueryClient();

    expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
    expect(screen.getByText('Registre uma avaliação para acompanhar sua evolução.')).toBeTruthy();
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

    renderWithQueryClient();

    const card = await screen.findByTestId('assessment-card-assessment-new');
    expect(within(card).getByText('12/06/2026')).toBeTruthy();
    expect(within(card).getByText('80 kg')).toBeTruthy();
    expect(within(card).getByText('19% de gordura')).toBeTruthy();
    expect(within(card).getByText('2 kg a menos')).toBeTruthy();
    expect(within(card).getByText('2 p.p. a menos')).toBeTruthy();
    expect(within(card).getByText('Evoluiu')).toBeTruthy();
    expect(await screen.findByText('12/05/2026')).toBeTruthy();
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
});
