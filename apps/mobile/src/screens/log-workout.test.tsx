import type { workoutPlanFullSchema } from '@muvit/validators';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import type { GuidedSession } from '../application/workouts/guided-session';

let LogWorkoutScreen: typeof import('./log-workout').LogWorkoutScreen;

type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type PreventRemoveEvent = { data: { action: unknown } };

const routerState = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  dayId: '22222222-2222-4222-8222-222222222222',
}));

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const storageState = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));
const navigationState = vi.hoisted(() => ({
  dispatch: vi.fn(),
  enabled: false,
  callback: null as ((event: PreventRemoveEvent) => void) | null,
}));
const authState = vi.hoisted(() => ({
  data: { user: { id: 'auth-user-id', role: 'student' as const } },
  isPending: false,
}));

vi.mock('expo-router', () => ({
  router: { back: routerState.back, replace: routerState.replace },
  useLocalSearchParams: () => ({ dayId: routerState.dayId }),
  useNavigation: () => ({ dispatch: navigationState.dispatch }),
}));

vi.mock('../lib/use-prevent-remove', () => ({
  usePreventRemove: (enabled: boolean, callback: (event: PreventRemoveEvent) => void) => {
    navigationState.enabled = enabled;
    navigationState.callback = callback;
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

vi.mock('../lib/auth-client', () => ({
  authClient: { useSession: () => authState },
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: storageState,
}));

const workoutPlan: WorkoutPlan = {
  id: '44444444-4444-4444-8444-444444444444',
  studentId: '55555555-5555-4555-8555-555555555555',
  trainerId: null,
  name: 'Plano A',
  startDate: null,
  endDate: null,
  status: 'active',
  notes: null,
  createdAt: '2026-08-15T12:00:00.000Z',
  days: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      planId: '44444444-4444-4444-8444-444444444444',
      label: 'Treino A',
      dayOrder: 0,
      exercises: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          workoutDayId: '22222222-2222-4222-8222-222222222222',
          exerciseId: '33333333-3333-4333-8333-333333333333',
          exerciseOrder: 0,
          sets: 2,
          reps: '10',
          loadKg: 20,
          restSeconds: 60,
          tempo: null,
          notes: null,
          exercise: {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Supino inclinado',
            muscleGroup: 'Peito',
          },
        },
        {
          id: '66666666-6666-4666-8666-666666666666',
          workoutDayId: '22222222-2222-4222-8222-222222222222',
          exerciseId: '77777777-7777-4777-8777-777777777777',
          exerciseOrder: 1,
          sets: 1,
          reps: '12',
          loadKg: null,
          restSeconds: 45,
          tempo: null,
          notes: null,
          exercise: {
            id: '77777777-7777-4777-8777-777777777777',
            name: 'Tríceps corda',
            muscleGroup: 'Braços',
          },
        },
      ],
    },
  ],
};

const planSummary = {
  id: workoutPlan.id,
  studentId: workoutPlan.studentId,
  trainerId: workoutPlan.trainerId,
  name: workoutPlan.name,
  startDate: workoutPlan.startDate,
  endDate: workoutPlan.endDate,
  status: workoutPlan.status,
  createdAt: workoutPlan.createdAt,
};

const draftSession: GuidedSession = {
  version: 1,
  workoutDayId: routerState.dayId,
  startedAtMs: 1_000,
  updatedAtMs: 2_000,
  currentExerciseIndex: 0,
  currentSetIndex: 1,
  phase: 'set',
  restEndsAtMs: null,
  sets: [
    {
      workoutExerciseId: workoutPlan.days[0].exercises[0].id,
      setNumber: 1,
      repsDone: '10',
      loadKg: '22',
      completed: true,
    },
    {
      workoutExerciseId: workoutPlan.days[0].exercises[0].id,
      setNumber: 2,
      repsDone: '',
      loadKg: '22',
      completed: false,
    },
    {
      workoutExerciseId: workoutPlan.days[0].exercises[1].id,
      setNumber: 1,
      repsDone: '',
      loadKg: '',
      completed: false,
    },
  ],
};

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <LogWorkoutScreen />
    </QueryClientProvider>,
  );
  return { queryClient, view };
}

function mockWorkoutDay(): void {
  apiState.request
    .mockResolvedValueOnce({ items: [planSummary] })
    .mockResolvedValueOnce(workoutPlan);
}

function mockSuccessfulFinish(): void {
  apiState.request.mockResolvedValueOnce({ id: 'log-id' }).mockResolvedValueOnce(undefined);
}

function mockDraftStorage(): void {
  storageState.getItem.mockImplementation(async (key: string) => {
    if (key === `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`) {
      return JSON.stringify(draftSession);
    }
    return null;
  });
}

function pressPreventedNavigation(action: unknown = { type: 'GO_BACK' }): void {
  act(() => {
    navigationState.callback?.({ data: { action } });
  });
}

describe('LogWorkoutScreen', () => {
  beforeAll(async () => {
    ({ LogWorkoutScreen } = await import('./log-workout'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    routerState.dayId = '22222222-2222-4222-8222-222222222222';
    authState.data = { user: { id: 'auth-user-id', role: 'student' } };
    authState.isPending = false;
    navigationState.enabled = false;
    navigationState.callback = null;
    apiState.request.mockReset();
    storageState.getItem.mockReset().mockResolvedValue(null);
    storageState.removeItem.mockReset().mockResolvedValue(undefined);
    storageState.setItem.mockReset().mockResolvedValue(undefined);
  });

  it('exibe treino indisponível e oferece nova tentativa quando o carregamento falha', async () => {
    apiState.request.mockRejectedValueOnce(new Error('offline'));
    renderWithQueryClient();

    expect(await screen.findByText('Treino indisponível')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();

    mockWorkoutDay();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
  });

  it('registra séries, atravessa descanso, confirma exercício e conclui o treino', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockSuccessfulFinish();
    renderWithQueryClient();

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    expect(await screen.findByText('Descanso')).toBeTruthy();
    expect(screen.getByText(/Tempo restante/)).toBeTruthy();
    const beforeExtension =
      storageState.setItem.mock.calls[storageState.setItem.mock.calls.length - 1]?.[1];
    expect(beforeExtension).toEqual(expect.any(String));
    const restBefore = JSON.parse(beforeExtension as string) as GuidedSession;
    await user.press(screen.getByRole('button', { name: '+15 s' }));
    const afterExtension =
      storageState.setItem.mock.calls[storageState.setItem.mock.calls.length - 1]?.[1];
    const restAfter = JSON.parse(afterExtension as string) as GuidedSession;
    expect(restAfter.restEndsAtMs).toBe((restBefore.restEndsAtMs ?? 0) + 15_000);
    await user.press(screen.getByRole('button', { name: 'Pular descanso' }));
    expect(screen.getByText('Série 2 de 2')).toBeTruthy();
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    expect(await screen.findByText('Supino inclinado concluído')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Próximo exercício' }));
    expect(screen.getByText('Série 1 de 1')).toBeTruthy();
    await user.type(screen.getByLabelText('Repetições realizadas'), '12');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));

    expect(screen.getAllByText('Treino concluído').length).toBeGreaterThan(0);
    await user.press(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(routerState.replace).toHaveBeenCalledWith('/(tabs)');
    await waitFor(() =>
      expect(storageState.removeItem).toHaveBeenCalledWith(
        `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
      ),
    );
  });

  it('retoma a série e os valores do rascunho particionado por usuário e dia', async () => {
    mockWorkoutDay();
    mockDraftStorage();
    renderWithQueryClient();

    expect(await screen.findByText('Treino em andamento')).toBeTruthy();
    expect(screen.getByText('Série 2 de 2')).toBeTruthy();
    expect(screen.getByLabelText('Repetições realizadas')).toHaveProp('value', '');
    expect(screen.getByLabelText('Carga utilizada')).toHaveProp('value', '22');
    expect(storageState.getItem).toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );
  });

  it('exibe conclusão enfileirada e remove o rascunho após confirmar a fila offline', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    apiState.request.mockRejectedValueOnce(new Error('offline ao concluir'));
    storageState.getItem.mockResolvedValue(null);
    renderWithQueryClient();

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    await user.press(screen.getByRole('button', { name: 'Pular descanso' }));
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    await user.press(screen.getByRole('button', { name: 'Próximo exercício' }));
    await user.type(screen.getByLabelText('Repetições realizadas'), '12');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));

    expect(await screen.findByText('Treino salvo para sincronização')).toBeTruthy();
    expect(storageState.removeItem).toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );
  });

  it('mantém o rascunho e oferece retry quando API e fila falham', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    storageState.setItem.mockImplementation(async (key: string) => {
      if (key === 'muvit_pending_logs') throw new Error('fila indisponível');
    });
    apiState.request.mockRejectedValueOnce(new Error('offline ao concluir'));
    renderWithQueryClient();

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    await user.press(screen.getByRole('button', { name: 'Pular descanso' }));
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    await user.press(screen.getByRole('button', { name: 'Próximo exercício' }));
    await user.type(screen.getByLabelText('Repetições realizadas'), '12');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));

    expect(await screen.findByText(/Não foi possível concluir o treino/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(storageState.removeItem).not.toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );
  });

  it('mantém a sessão utilizável e torna visível a falha ao salvar o rascunho', async () => {
    mockWorkoutDay();
    storageState.setItem.mockRejectedValue(new Error('storage indisponível'));
    renderWithQueryClient();

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
    expect(await screen.findByText(/Não foi possível salvar seu progresso/)).toBeTruthy();
  });

  it('continua treinando sem despachar nem remover o rascunho', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    pressPreventedNavigation();
    expect(await screen.findByText('Sair da sessão')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Continuar treinando' }));

    expect(screen.queryByText('Sair da sessão')).toBeNull();
    expect(navigationState.dispatch).not.toHaveBeenCalled();
    expect(storageState.removeItem).not.toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );
  });

  it('salva e despacha uma navegação interceptada exatamente uma vez', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const action = { type: 'GO_BACK', key: 'session' };
    pressPreventedNavigation(action);
    await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));

    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
    expect(navigationState.dispatch).toHaveBeenCalledWith(action);
    expect(storageState.removeItem).not.toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );
  });

  it('descarta explicitamente o rascunho e despacha a navegação interceptada', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const action = { type: 'GO_BACK', key: 'discard' };
    pressPreventedNavigation(action);
    await user.press(screen.getByRole('button', { name: 'Encerrar treino' }));

    await waitFor(() =>
      expect(storageState.removeItem).toHaveBeenCalledWith(
        `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
      ),
    );
    expect(navigationState.dispatch).toHaveBeenCalledOnce();
    expect(navigationState.dispatch).toHaveBeenCalledWith(action);
  });

  it('limpa a ação interceptada ao trocar a identidade autenticada', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    const { queryClient, view } = renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const oldAction = { type: 'GO_BACK', key: 'old-user' };
    pressPreventedNavigation(oldAction);
    expect(await screen.findByText('Sair da sessão')).toBeTruthy();

    authState.data = { user: { id: 'other-auth-user-id', role: 'student' } };
    mockWorkoutDay();
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.queryByText('Sair da sessão')).toBeNull());

    navigationState.dispatch.mockClear();
    const newAction = { type: 'GO_BACK', key: 'new-user' };
    pressPreventedNavigation(newAction);
    await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));

    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
    expect(navigationState.dispatch).toHaveBeenCalledWith(newAction);
    expect(navigationState.dispatch).not.toHaveBeenCalledWith(oldAction);
  });
});
