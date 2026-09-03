import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainerHomeScreen } from './trainer-home';

type LinkProps = {
  children: ReactNode;
  href: string;
};

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const linkState = vi.hoisted(() => ({ hrefs: [] as string[] }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  Link: ({ children, href }: LinkProps) => {
    linkState.hrefs.push(href);
    return children;
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function renderTrainerHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerHomeScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiState.request.mockReset();
  linkState.hrefs.length = 0;
});

describe('TrainerHomeScreen', () => {
  it('mostra loading enquanto o resumo está pendente', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerHome();

    expect(screen.getByText('Carregando visão geral')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('permite retry após erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    expect(await screen.findByText('Não foi possível carregar a visão geral')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('exibe o estado vazio quando não há alunos vinculados', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
    expect(screen.getByText('Nenhum aluno vinculado para acompanhar no momento.')).toBeTruthy();
    expect(screen.queryByText('Alunos ativos')).toBeNull();
  });

  it('renderiza os indicadores retornados pela API', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
      workouts: { activePlans: 8 },
      assessments: { last30d: 6 },
    });

    renderTrainerHome();

    expect(await screen.findByText('9')).toBeTruthy();
    expect(screen.getByText('12 vinculados')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('2 pausados • 1 inativos')).toBeTruthy();
  });

  it('navega para a carteira ao pressionar Ver alunos', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({
      students: { total: 2, active: 2, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 1 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    await user.press(await screen.findByRole('button', { name: 'Ver alunos' }));

    expect(linkState.hrefs).toContain('/trainer/students');
  });

  it('preserva os indicadores quando uma atualização tardia falha', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({
        students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
        workouts: { activePlans: 8 },
        assessments: { last30d: 6 },
      })
      .mockRejectedValueOnce(new Error('offline'));

    renderTrainerHome();

    expect(await screen.findByText('12 vinculados')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar a visão geral.')).toBeTruthy();
    expect(screen.getByText('12 vinculados')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
  });
});
