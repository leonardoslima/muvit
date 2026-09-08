import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerWorkoutPlanSummary } from '../application/workouts/trainer-workout-data';
import { ApiError } from '../lib/api';
import { TrainerWorkoutsScreen } from './trainer-workouts';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  dismissTo: vi.fn(),
  push: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({
  studentId: '00000000-0000-0000-0000-000000000001' as string | undefined,
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => paramsState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function planFixture(
  overrides: Partial<TrainerWorkoutPlanSummary> = {},
): TrainerWorkoutPlanSummary {
  return {
    id: PLAN_ID,
    studentId: STUDENT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    name: 'Hipertrofia',
    startDate: null,
    endDate: null,
    status: 'draft',
    createdAt: '2026-09-06T12:00:00.000Z',
    ...overrides,
  };
}

function renderTrainerWorkouts() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerWorkoutsScreen />
    </QueryClientProvider>,
  );
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.dismissTo.mockReset();
  routerState.push.mockReset();
  paramsState.studentId = STUDENT_ID;
});

describe('TrainerWorkoutsScreen', () => {
  it('lista planos e abre o detalhe', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({ items: [planFixture()] });

    renderTrainerWorkouts();

    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledWith(
      `/students/${STUDENT_ID}/workout-plans`,
      expect.objectContaining({ signal: expect.anything() }),
    );

    await user.press(
      screen.getByRole('button', {
        name: 'Abrir Hipertrofia, status: Rascunho, criado em 06/09/2026',
      }),
    );

    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]/workouts/[planId]',
      params: { studentId: STUDENT_ID, planId: PLAN_ID },
    });
  });

  it('mostra aluno inválido e não faz request', async () => {
    const user = userEvent.setup();
    paramsState.studentId = undefined;

    renderTrainerWorkouts();

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Voltar para alunos' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith('/trainer/students');
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerWorkouts();

    expect(screen.getByText('Carregando treinos')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('trata 404 como indisponibilidade genérica', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerWorkouts();

    expect(await screen.findByText('Treinos não encontrados')).toBeTruthy();
    expect(screen.getByText('Estes treinos não estão disponíveis para sua conta.')).toBeTruthy();
  });

  it('permite retry depois de erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [] });

    renderTrainerWorkouts();

    expect(await screen.findByText('Não foi possível carregar os treinos')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhum treino cadastrado')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('mostra vazio e abre novo treino', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({ items: [] });

    renderTrainerWorkouts();

    expect(await screen.findByText('Nenhum treino cadastrado')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Novo treino' }));

    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]/workouts/new',
      params: { studentId: STUDENT_ID },
    });
  });

  it('renderiza os três status e volta para o aluno', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({
      items: [
        planFixture({ id: PLAN_ID, name: 'Ativo', status: 'active' }),
        planFixture({ id: '00000000-0000-0000-0000-000000000302', name: 'Rascunho' }),
        planFixture({
          id: '00000000-0000-0000-0000-000000000303',
          name: 'Histórico',
          status: 'archived',
          startDate: '2026-09-01',
          endDate: '2026-09-30',
        }),
      ],
    });

    renderTrainerWorkouts();

    expect((await screen.findAllByText('Ativo')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Rascunho')).length).toBeGreaterThan(0);
    expect(screen.getByText('Arquivado')).toBeTruthy();
    expect(screen.getByText('01/09/2026 — 30/09/2026')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Voltar para aluno' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith(`/trainer/students/${STUDENT_ID}`);
  });

  it('preserva a lista e informa falha de atualização', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [planFixture()] })
      .mockRejectedValueOnce(new Error('offline'));

    renderTrainerWorkouts();
    expect(await screen.findByText('Hipertrofia')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar os treinos.')).toBeTruthy();
    expect(screen.getByText('Hipertrofia')).toBeTruthy();
  });

  it('oculta o cache quando atualização retorna 404', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [planFixture()] })
      .mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerWorkouts();
    expect(await screen.findByText('Hipertrofia')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Treinos não encontrados')).toBeTruthy();
    expect(screen.queryByText('Hipertrofia')).toBeNull();
  });

  it('mostra atualização e bloqueia ações durante refetch', async () => {
    const user = userEvent.setup();
    const refresh = deferred<{ items: TrainerWorkoutPlanSummary[] }>();
    apiState.request
      .mockResolvedValueOnce({ items: [planFixture()] })
      .mockReturnValueOnce(refresh.promise);

    renderTrainerWorkouts();
    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));

    expect(screen.getByRole('button', { name: 'Atualizando...' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.getByRole('button', { name: 'Novo treino' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await act(async () => {
      refresh.resolve({ items: [planFixture()] });
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      ),
    );
  });
});
