import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { type ReactNode, createElement } from 'react';
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

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { color: string; name: string; size: number }) =>
    createElement('Ionicons', props),
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
  it('segue a hierarquia visual do progresso e oferece uma ação compacta', async () => {
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderWithQueryClient();

    expect(await screen.findByText('PROGRESSO')).toBeTruthy();
    expect(screen.getByTestId('progress-header')).toBeTruthy();
    expect(screen.getByText('Sua evolução, avaliação por avaliação.')).toBeTruthy();

    const action = screen.getByRole('button', { name: 'Nova avaliação' });
    expect(action.props.accessibilityRole).toBe('button');
    expect(action.props.accessibilityLabel).toBe('Nova avaliação');
  });

  it('apresenta avaliações com identidade, métrica agrupada e status de evolução', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'assessment-preview',
          date: '2026-06-12',
          weightKg: 80,
          bodyFatPct: 19,
          notes: null,
        },
      ],
    });

    renderWithQueryClient();

    const card = await screen.findByTestId('assessment-card-assessment-preview');
    expect(within(card).getByTestId('assessment-icon-assessment-preview')).toBeTruthy();
    expect(within(card).getByText('Avaliação física')).toBeTruthy();
    expect(within(card).getByText('Peso')).toBeTruthy();
    expect(within(card).getByText('Gordura corporal')).toBeTruthy();
    expect(within(card).getByText('80 kg')).toBeTruthy();
    expect(within(card).getByText('19%')).toBeTruthy();
    expect(within(card).getByText('Referência atual')).toBeTruthy();
  });

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
      total: 3,
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
        {
          id: 'assessment-start',
          date: '2026-04-12',
          weightKg: 84,
          bodyFatPct: 23,
          notes: null,
        },
      ],
    });

    renderWithQueryClient();

    const card = await screen.findByTestId('assessment-card-assessment-new');
    expect(within(card).getByText('12/06/2026')).toBeTruthy();
    expect(within(card).getByText('80 kg')).toBeTruthy();
    expect(within(card).getByText('19%')).toBeTruthy();
    expect(within(card).getByText('Referência atual')).toBeTruthy();
    expect(within(card).getByText('Evoluiu')).toBeTruthy();
    const previousCard = await screen.findByTestId('assessment-card-assessment-previous');
    expect(within(previousCard).getByText('12/05/2026')).toBeTruthy();
    expect(within(previousCard).getByText('−2 kg · −2 p.p.')).toBeTruthy();
  });

  it('exibe ganhos de peso e gordura com sinal positivo', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 3,
      items: [
        {
          id: 'assessment-gain-current',
          date: '2026-07-12',
          weightKg: 84,
          bodyFatPct: 25,
          notes: null,
        },
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
    expect(within(card).getByText('+2 kg · +2 p.p.')).toBeTruthy();
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
    expect(within(card).getByText('—')).toBeTruthy();
  });
});
