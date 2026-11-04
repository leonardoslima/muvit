import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  TrainerWorkoutPlanDraft,
  TrainerWorkoutPlanSummary,
} from '../application/workouts/trainer-workout-data';
import { ApiError } from '../lib/api';
import { TrainerWorkoutsScreen } from './trainer-workouts';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_STUDENT_ID = '00000000-0000-0000-0000-000000000002';
const AUTH_USER_ID = '00000000-0000-0000-0000-000000000801';
const OTHER_AUTH_USER_ID = '00000000-0000-0000-0000-000000000802';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const DRAFT_ID = '00000000-0000-0000-0000-000000000501';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  dismissTo: vi.fn(),
  push: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({
  studentId: '00000000-0000-0000-0000-000000000001' as string | undefined,
}));
const authState = vi.hoisted(() => ({
  userId: '00000000-0000-0000-0000-000000000801' as string | undefined,
  isPending: false,
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: authState.userId ? { user: { id: authState.userId } } : undefined,
      isPending: authState.isPending,
    }),
  },
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

function draftFixture(overrides: Partial<TrainerWorkoutPlanDraft> = {}): TrainerWorkoutPlanDraft {
  return {
    id: DRAFT_ID,
    trainerId: AUTH_USER_ID,
    studentId: STUDENT_ID,
    sourcePlanId: null,
    payload: {
      name: 'Treino de criação',
      notes: '',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: '00000000-0000-0000-0000-000000000101',
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
            },
          ],
        },
      ],
    },
    selectedDayOrder: 0,
    revision: 1,
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
    exerciseReferences: [
      {
        id: '00000000-0000-0000-0000-000000000101',
        name: 'Supino reto',
        muscleGroup: 'chest',
      },
    ],
    ...overrides,
  };
}

function renderTrainerWorkouts(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <TrainerWorkoutsScreen />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
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
  apiState.request.mockResolvedValue({ items: [] });
  routerState.dismissTo.mockReset();
  routerState.push.mockReset();
  paramsState.studentId = STUDENT_ID;
  authState.userId = AUTH_USER_ID;
  authState.isPending = false;
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
    expect(apiState.request).toHaveBeenCalledWith(
      `/students/${STUDENT_ID}/workout-plan-drafts`,
      expect.objectContaining({ signal: expect.anything() }),
    );

    await user.press(screen.getByRole('button', { name: 'Abrir Hipertrofia, Rascunho' }));

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
    expect(screen.getByLabelText('Carregando treinos')).toBeTruthy();
  });

  it('trata 404 como indisponibilidade genérica', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerWorkouts();

    expect(await screen.findByText('Treinos não encontrados')).toBeTruthy();
    expect(screen.getByText('Estes treinos não estão disponíveis para sua conta.')).toBeTruthy();
  });

  it('permite retry depois de erro inicial', async () => {
    const user = userEvent.setup();
    const plansRetry = deferred<{ items: TrainerWorkoutPlanSummary[] }>();
    const draftsRetry = deferred<{ items: TrainerWorkoutPlanDraft[] }>();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [] });
    apiState.request
      .mockReturnValueOnce(plansRetry.promise)
      .mockReturnValueOnce(draftsRetry.promise);

    renderTrainerWorkouts();

    expect(await screen.findByText('Não foi possível carregar os treinos')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(screen.getByLabelText('Carregando treinos')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await act(async () => {
      plansRetry.resolve({ items: [] });
      draftsRetry.resolve({ items: [] });
    });

    expect(await screen.findByText('Nenhum treino cadastrado')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(4);
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
      .mockResolvedValueOnce({ items: [] })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [] });

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
      .mockResolvedValueOnce({
        items: [
          draftFixture({
            payload: { ...draftFixture().payload, name: 'Rascunho privado anterior' },
          }),
        ],
      })
      .mockRejectedValueOnce(new ApiError('not found', 404))
      .mockResolvedValueOnce({ items: [] });

    renderTrainerWorkouts();
    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    expect(await screen.findByText('Rascunho privado anterior')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Treinos não encontrados')).toBeTruthy();
    expect(screen.queryByText('Hipertrofia')).toBeNull();
    expect(screen.queryByText('Rascunho privado anterior')).toBeNull();
  });

  it('mostra atualização e bloqueia ações durante refetch', async () => {
    const user = userEvent.setup();
    const refresh = deferred<{ items: TrainerWorkoutPlanSummary[] }>();
    const refreshDrafts = deferred<{ items: TrainerWorkoutPlanDraft[] }>();
    apiState.request
      .mockResolvedValueOnce({ items: [planFixture()] })
      .mockResolvedValueOnce({ items: [] })
      .mockReturnValueOnce(refresh.promise);
    apiState.request.mockReturnValueOnce(refreshDrafts.promise);

    renderTrainerWorkouts();
    expect(await screen.findByText('Hipertrofia')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(4));
    expect(apiState.request).toHaveBeenNthCalledWith(
      3,
      `/students/${STUDENT_ID}/workout-plans`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(apiState.request).toHaveBeenNthCalledWith(
      4,
      `/students/${STUDENT_ID}/workout-plan-drafts`,
      expect.objectContaining({ signal: expect.anything() }),
    );

    expect(screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.getByLabelText('Atualizando')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Novo treino' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await act(async () => {
      refresh.resolve({ items: [planFixture()] });
      refreshDrafts.resolve({ items: [] });
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      ),
    );
  });

  it('continua drafts de criação e edição com o contexto correto', async () => {
    const user = userEvent.setup();
    const editDraftId = '00000000-0000-0000-0000-000000000502';
    apiState.request.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({
      items: [
        draftFixture(),
        draftFixture({
          id: editDraftId,
          sourcePlanId: PLAN_ID,
          payload: { ...draftFixture().payload, name: 'Treino em edição' },
        }),
      ],
    });

    renderTrainerWorkouts();

    expect(await screen.findByText('Nova prescrição')).toBeTruthy();
    expect(screen.getByText('Alteração em rascunho')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Continuar rascunho: Treino de criação' }));
    expect(routerState.push).toHaveBeenLastCalledWith({
      pathname: '/trainer/students/[studentId]/workouts/new',
      params: { studentId: STUDENT_ID, draftId: DRAFT_ID },
    });

    await user.press(screen.getByRole('button', { name: 'Continuar rascunho: Treino em edição' }));
    expect(routerState.push).toHaveBeenLastCalledWith({
      pathname: '/trainer/students/[studentId]/workouts/[planId]/edit',
      params: { studentId: STUDENT_ID, planId: PLAN_ID, draftId: editDraftId },
    });
  });

  it('não reaproveita dados ao trocar a identidade autenticada', async () => {
    const oldPlan = planFixture({ name: 'Plano privado anterior' });
    const pendingPlans = deferred<{ items: TrainerWorkoutPlanSummary[] }>();
    const pendingDrafts = deferred<{ items: TrainerWorkoutPlanDraft[] }>();
    apiState.request.mockResolvedValueOnce({ items: [oldPlan] }).mockResolvedValueOnce({
      items: [
        draftFixture({
          payload: { ...draftFixture().payload, name: 'Rascunho privado anterior' },
        }),
      ],
    });

    const { queryClient, rerender } = renderTrainerWorkouts();
    expect(await screen.findByText('Plano privado anterior')).toBeTruthy();
    expect(await screen.findByText('Rascunho privado anterior')).toBeTruthy();

    authState.userId = OTHER_AUTH_USER_ID;
    apiState.request
      .mockReturnValueOnce(pendingPlans.promise)
      .mockReturnValueOnce(pendingDrafts.promise);
    rerender(
      <QueryClientProvider client={queryClient}>
        <TrainerWorkoutsScreen />
      </QueryClientProvider>,
    );

    expect(screen.queryByText('Plano privado anterior')).toBeNull();
    expect(screen.queryByText('Rascunho privado anterior')).toBeNull();
    expect(screen.getByText('Carregando treinos')).toBeTruthy();
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['trainer', 'workouts', STUDENT_ID, OTHER_AUTH_USER_ID],
        exact: true,
      }),
    ).toBeDefined();
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(4));
    expect(apiState.request).toHaveBeenNthCalledWith(
      3,
      `/students/${STUDENT_ID}/workout-plans`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(apiState.request).toHaveBeenNthCalledWith(
      4,
      `/students/${STUDENT_ID}/workout-plan-drafts`,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('não reaproveita dados ao trocar o aluno do contexto', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [planFixture({ name: 'Plano do primeiro aluno' })] })
      .mockResolvedValueOnce({
        items: [
          draftFixture({
            payload: { ...draftFixture().payload, name: 'Rascunho do primeiro aluno' },
          }),
        ],
      });

    const { queryClient, rerender } = renderTrainerWorkouts();
    expect(await screen.findByText('Plano do primeiro aluno')).toBeTruthy();
    expect(await screen.findByText('Rascunho do primeiro aluno')).toBeTruthy();

    paramsState.studentId = OTHER_STUDENT_ID;
    apiState.request
      .mockResolvedValueOnce({
        items: [planFixture({ studentId: OTHER_STUDENT_ID, name: 'Plano do segundo aluno' })],
      })
      .mockResolvedValueOnce({
        items: [
          draftFixture({
            studentId: OTHER_STUDENT_ID,
            payload: { ...draftFixture().payload, name: 'Rascunho do segundo aluno' },
          }),
        ],
      });
    rerender(
      <QueryClientProvider client={queryClient}>
        <TrainerWorkoutsScreen />
      </QueryClientProvider>,
    );

    expect(screen.queryByText('Plano do primeiro aluno')).toBeNull();
    expect(screen.queryByText('Rascunho do primeiro aluno')).toBeNull();
    expect(await screen.findByText('Plano do segundo aluno')).toBeTruthy();
    expect(await screen.findByText('Rascunho do segundo aluno')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      `/students/${OTHER_STUDENT_ID}/workout-plan-drafts`,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});
