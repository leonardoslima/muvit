import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
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

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolvePromise = (_value: T): void => undefined;
  let rejectPromise = (_reason?: unknown): void => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

beforeEach(() => {
  apiState.request.mockReset();
  linkState.hrefs.length = 0;
});

describe('TrainerHomeScreen', () => {
  it('mostra loading enquanto o resumo está pendente', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerHome();

    expect(screen.getByRole('header', { name: 'Início' })).toBeTruthy();
    expect(screen.getByText('Carregando visão geral')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Carregando visão geral' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);
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
    expect(screen.getByRole('header', { name: 'Início' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

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
    expect(screen.queryByRole('button', { name: 'Ver alunos' })).toBeNull();
  });

  it('renderiza os indicadores retornados pela API', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
      workouts: { activePlans: 8 },
      assessments: { last30d: 6 },
    });

    renderTrainerHome();

    expect(await screen.findByText('9')).toBeTruthy();
    expect(screen.getByText('12 alunos vinculados')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('2 pausados')).toBeTruthy();
    expect(screen.getByText('1 inativo')).toBeTruthy();
  });

  it('usa o verde profundo e o texto claro no destaque da carteira', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
      workouts: { activePlans: 8 },
      assessments: { last30d: 6 },
    });

    renderTrainerHome();

    expect((await screen.findByTestId('trainer-portfolio')).props.className).toContain(
      'bg-v2-text',
    );
    expect(screen.getByText('9').props.className).toContain('text-v2-sessionText');
  });

  it('separa pausados e inativos em linhas após um divisor', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
      workouts: { activePlans: 8 },
      assessments: { last30d: 6 },
    });

    renderTrainerHome();

    await screen.findByText('2 pausados');
    const statusGroup = screen.getByTestId('trainer-status-group');

    expect(statusGroup?.props.className).toContain('flex-col');
    expect(statusGroup?.props.className).toContain('border-t');
  });

  it('mantém a carteira quando há alunos vinculados e nenhum ativo', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 2, active: 0, paused: 1, inactive: 1, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    expect(await screen.findByText('Alunos ativos')).toBeTruthy();
    expect(screen.getByText('2 alunos vinculados')).toBeTruthy();
    expect(screen.getByText('1 pausado')).toBeTruthy();
    expect(screen.getByText('1 inativo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver alunos' })).toBeTruthy();
    expect(screen.queryByText('Nenhum aluno vinculado')).toBeNull();
  });

  it('reduz o valor da carteira em layouts de 320 dp', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 2, active: 7, paused: 1, inactive: 1, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();
    const activeCount = await screen.findByText('7');
    expect(activeCount.props.className).toContain('text-[50px]');

    act(() => {
      fireEvent(screen.getByTestId('trainer-portfolio'), 'layout', {
        nativeEvent: { layout: { width: 288, height: 240, x: 0, y: 0 } },
      });
    });

    expect(screen.getByText('7').props.className).toContain('text-[44px]');
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

    expect(await screen.findByText('12 alunos vinculados')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar a visão geral.')).toBeTruthy();
    expect(screen.getByText('12 alunos vinculados')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
  });

  it('preserva dados e bloqueia reentrada enquanto atualiza', async () => {
    const user = userEvent.setup();
    const refresh = deferred<{
      students: {
        total: number;
        active: number;
        paused: number;
        inactive: number;
        newThisWeek: number;
      };
      workouts: { activePlans: number };
      assessments: { last30d: number };
    }>();
    apiState.request
      .mockResolvedValueOnce({
        students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
        workouts: { activePlans: 8 },
        assessments: { last30d: 6 },
      })
      .mockReturnValueOnce(refresh.promise);

    renderTrainerHome();
    expect(await screen.findByText('12 alunos vinculados')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));

    expect(screen.getByText('Atualizando')).toBeTruthy();
    expect(screen.getByText('Aguarde enquanto os dados são atualizados.')).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getByText('12 alunos vinculados')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    const reload = screen.getByRole('button', { name: 'Atualizar' });
    expect(reload.props.accessibilityState.disabled).toBe(true);
    await user.press(reload);
    expect(apiState.request).toHaveBeenCalledTimes(2);

    refresh.reject(new Error('offline'));
    expect(await screen.findByText('Não foi possível atualizar a visão geral.')).toBeTruthy();
    expect(screen.queryByText('Atualizando')).toBeNull();
    expect(screen.getByText('12 alunos vinculados')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
  });
});
