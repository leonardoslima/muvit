import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerWorkoutPlan } from '../application/workouts/trainer-workout-data';
import { ApiError } from '../lib/api';
import { TrainerWorkoutDetailScreen } from './trainer-workout-detail';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_STUDENT_ID = '00000000-0000-0000-0000-000000000002';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const DAY_ID = '00000000-0000-0000-0000-000000000201';
const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';
const EXERCISE_ROW_ID = '00000000-0000-0000-0000-000000000401';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  dismissTo: vi.fn(),
  push: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({
  studentId: '00000000-0000-0000-0000-000000000001' as string | undefined,
  planId: '00000000-0000-0000-0000-000000000301' as string | undefined,
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

function planFixture(overrides: Partial<TrainerWorkoutPlan> = {}): TrainerWorkoutPlan {
  return {
    id: PLAN_ID,
    studentId: STUDENT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    name: 'Hipertrofia',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: 'active',
    notes: 'Priorizar técnica',
    createdAt: '2026-09-06T12:00:00.000Z',
    days: [
      {
        id: DAY_ID,
        planId: PLAN_ID,
        label: 'Treino A',
        dayOrder: 0,
        exercises: [
          {
            id: EXERCISE_ROW_ID,
            workoutDayId: DAY_ID,
            exerciseId: EXERCISE_ID,
            exerciseOrder: 0,
            sets: 4,
            reps: '8-10',
            restSeconds: 90,
            loadKg: '82.50',
            tempo: '3010',
            notes: 'Sem falhar',
            exercise: {
              id: EXERCISE_ID,
              name: 'Supino reto',
              muscleGroup: 'chest',
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

function renderDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerWorkoutDetailScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.dismissTo.mockReset();
  routerState.push.mockReset();
  paramsState.studentId = STUDENT_ID;
  paramsState.planId = PLAN_ID;
});

describe('TrainerWorkoutDetailScreen', () => {
  it('renderiza metadados, dias, opcionais e não expõe tempo', async () => {
    apiState.request.mockResolvedValueOnce(planFixture());

    renderDetail();

    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    expect(screen.getByText('Ativo')).toBeTruthy();
    expect(screen.getByText('01/09/2026 — 30/09/2026')).toBeTruthy();
    expect(screen.getByText('Priorizar técnica')).toBeTruthy();
    expect(screen.getByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('4 séries · 8-10 reps')).toBeTruthy();
    expect(screen.getByText('Carga: 82,5 kg')).toBeTruthy();
    expect(screen.getByText('Descanso: 90s')).toBeTruthy();
    expect(screen.getByText('Sem falhar')).toBeTruthy();
    expect(screen.queryByText('3010')).toBeNull();
  });

  it('valida params e retorna à lista segura sem request', async () => {
    const user = userEvent.setup();
    paramsState.studentId = undefined;
    paramsState.planId = undefined;

    renderDetail();

    expect(screen.getByText('Treino inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Voltar para treinos' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith('/trainer/students');
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderDetail();

    expect(screen.getByText('Carregando treino')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('mostra 404 genérico sem revelar escopo', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));

    renderDetail();

    expect(await screen.findByText('Treino não encontrado')).toBeTruthy();
    expect(screen.getByText('Este treino não está disponível para sua conta.')).toBeTruthy();
  });

  it('permite retry depois de erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(planFixture());

    renderDetail();

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('não renderiza plano de outro aluno no contexto da rota', async () => {
    apiState.request.mockResolvedValueOnce(planFixture({ studentId: OTHER_STUDENT_ID }));

    renderDetail();

    expect(await screen.findByText('Treino indisponível')).toBeTruthy();
    expect(screen.queryByText('Hipertrofia')).toBeNull();
    expect(screen.queryByText('Supino reto')).toBeNull();
  });

  it.each([
    ['active', true],
    ['draft', true],
    ['archived', false],
  ] as const)('mostra edição conforme status %s', async (status, canEdit) => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce(planFixture({ status }));

    renderDetail();
    await screen.findByText('Hipertrofia');

    const editButton = screen.queryByRole('button', { name: 'Editar treino' });
    expect(Boolean(editButton)).toBe(canEdit);

    if (canEdit && editButton) {
      await user.press(editButton);
      expect(routerState.push).toHaveBeenCalledWith({
        pathname: '/trainer/students/[studentId]/workouts/[planId]/edit',
        params: { studentId: STUDENT_ID, planId: PLAN_ID },
      });
    }
  });

  it('atualiza o detalhe e preserva conteúdo quando refetch falha', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(planFixture())
      .mockRejectedValueOnce(new Error('offline'));

    renderDetail();
    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar o treino.')).toBeTruthy();
    expect(screen.getByText('Supino reto')).toBeTruthy();
  });

  it('oculta conteúdo quando refetch retorna 404', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(planFixture())
      .mockRejectedValueOnce(new ApiError('not found', 404));

    renderDetail();
    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Treino não encontrado')).toBeTruthy();
    expect(screen.queryByText('Supino reto')).toBeNull();
  });

  it('volta deterministicamente para a lista do aluno', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce(planFixture());

    renderDetail();
    await screen.findByText('Hipertrofia');
    await user.press(screen.getByRole('button', { name: 'Voltar para treinos' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith(`/trainer/students/${STUDENT_ID}/workouts`);
  });
});
