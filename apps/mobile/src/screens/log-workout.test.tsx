import type { workoutPlanFullSchema } from '@muvit/validators';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { StrictMode, useLayoutEffect } from 'react';
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

const readySession: GuidedSession = {
  ...draftSession,
  currentExerciseIndex: 1,
  currentSetIndex: 0,
  phase: 'ready-to-finish',
  sets: draftSession.sets.map((set) => ({
    ...set,
    repsDone: set.repsDone || '10',
    completed: true,
  })),
};

const incompleteReadySession: GuidedSession = {
  ...readySession,
  sets: readySession.sets.map((set, index) => (index === 0 ? { ...set, completed: false } : set)),
};

function planWithExercises(exercises: WorkoutPlan['days'][number]['exercises']): WorkoutPlan {
  return {
    ...workoutPlan,
    days: [{ ...workoutPlan.days[0], exercises }],
  };
}

const structuralDayCases: Array<[string, WorkoutPlan]> = [
  ['remoção de exercício', planWithExercises([workoutPlan.days[0].exercises[0]])],
  [
    'reordenação de exercícios',
    planWithExercises(
      [...workoutPlan.days[0].exercises].reverse().map((exercise, index) => ({
        ...exercise,
        exerciseOrder: index,
      })),
    ),
  ],
  [
    'redução de séries',
    planWithExercises(
      workoutPlan.days[0].exercises.map((exercise, index) =>
        index === 0 ? { ...exercise, sets: 1 } : exercise,
      ),
    ),
  ],
];

function renderWithQueryClient(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  }),
) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <LogWorkoutScreen />
    </QueryClientProvider>,
  );
  return { queryClient, view };
}

function mockWorkoutDay(plan: WorkoutPlan = workoutPlan): void {
  apiState.request
    .mockResolvedValueOnce({ items: [{ ...planSummary, id: plan.id, studentId: plan.studentId }] })
    .mockResolvedValueOnce(plan);
}

function mockSuccessfulFinish(): void {
  apiState.request.mockResolvedValueOnce({ id: 'log-id' }).mockResolvedValueOnce(undefined);
}

function mockDraftStorage(session: GuidedSession = draftSession): void {
  storageState.getItem.mockImplementation(async (key: string) => {
    if (key === `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`) {
      return JSON.stringify(session);
    }
    return null;
  });
}

function mockStatefulDraftStorage(session: GuidedSession | null = null): {
  getSerialized: () => string | null;
} {
  const key = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
  let serialized = session ? JSON.stringify(session) : null;

  storageState.getItem.mockImplementation(async (requestedKey: string) =>
    requestedKey === key ? serialized : null,
  );
  storageState.setItem.mockImplementation(async (requestedKey: string, value: string) => {
    if (requestedKey === key) serialized = value;
  });
  storageState.removeItem.mockImplementation(async (requestedKey: string) => {
    if (requestedKey === key) serialized = null;
  });

  return { getSerialized: () => serialized };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
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
    expect(screen.getByText('Última série registrada')).toBeTruthy();
    expect(screen.getByText('10 reps · 20 kg')).toBeTruthy();
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await user.press(screen.getByRole('button', { name: 'Concluir série' }));
    expect(await screen.findByText('Supino inclinado concluído')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Próximo exercício' }));
    expect(screen.getByText('Série 1 de 1')).toBeTruthy();
    expect(screen.queryByText('Última série registrada')).toBeNull();
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
    expect(screen.getByText('Última série registrada')).toBeTruthy();
    expect(screen.getByText('10 reps · 22 kg')).toBeTruthy();
    expect(storageState.getItem).toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );
  });

  it('sincroniza o cache ao editar e reabre o mesmo rascunho no mesmo QueryClient', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    const storage = mockStatefulDraftStorage();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    queryClient.setQueryData(['today-workout', authState.data.user.id], { status: 'old' });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { view } = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
    await user.type(screen.getByLabelText('Repetições realizadas'), '10');
    await waitFor(() => expect(storage.getSerialized()).toContain('10'));

    pressPreventedNavigation({ type: 'GO_BACK', key: 'save-cache' });
    await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));
    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['today-workout', authState.data.user.id],
    });

    mockWorkoutDay();
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen key="remount-after-save" />
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText('Repetições realizadas')).toHaveProp('value', '10');
  });

  it('remove o cache ao descartar e não ressuscita o rascunho na remontagem', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockStatefulDraftStorage(draftSession);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const guidedQueryKey = [
      'guided-workout-session',
      authState.data.user.id,
      routerState.dayId,
    ] as const;
    const { view } = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
    pressPreventedNavigation({ type: 'GO_BACK', key: 'discard-cache' });
    await user.press(screen.getByRole('button', { name: 'Encerrar treino' }));
    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
    expect(queryClient.getQueryData(guidedQueryKey)).toBeUndefined();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['today-workout', authState.data.user.id],
    });

    apiState.request.mockRejectedValue(new Error('offline após descarte'));
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen key="remount-after-discard" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Treino indisponível')).toBeTruthy();
    expect(screen.queryByText('Série 2 de 2')).toBeNull();
  });

  it('preserva duas edições rápidas, a ordem dos saves e o cache sem invalidar Hoje por caractere', async () => {
    mockWorkoutDay();
    const storage = mockStatefulDraftStorage();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderWithQueryClient(queryClient);

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
    invalidateSpy.mockClear();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const firstWrite = createDeferred<void>();
    let serialized = storage.getSerialized();
    const startedReps: string[] = [];
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      startedReps.push(saved.sets[0]?.repsDone ?? '');
      if (startedReps.length === 1) await firstWrite.promise;
      serialized = value;
    });

    const repsField = screen.getByLabelText('Repetições realizadas');
    act(() => {
      fireEvent.changeText(repsField, '1');
      fireEvent.changeText(repsField, '10');
    });

    expect(repsField).toHaveProp('value', '10');
    expect(
      queryClient.getQueryData<{ session: GuidedSession }>([
        'guided-workout-session',
        authState.data.user.id,
        routerState.dayId,
      ])?.session.sets[0]?.repsDone,
    ).toBe('10');

    await waitFor(() => expect(startedReps).toEqual(['1']));
    expect(JSON.parse(serialized ?? '').sets[0]?.repsDone).not.toBe('10');
    firstWrite.resolve();
    await waitFor(() => expect(startedReps).toEqual(['1', '10']));
    expect(JSON.parse(serialized ?? '').sets[0]?.repsDone).toBe('10');
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['today-workout', authState.data.user.id],
    });
  });

  it('particiona a fila por identidade e não deixa falha tardia de A afetar B', async () => {
    const user = userEvent.setup();
    const firstUserId = authState.data.user.id;
    const secondUserId = 'other-auth-user-id';
    const dayId = routerState.dayId;
    const firstKey = `muvit_workout_session:${firstUserId}:${dayId}`;
    const secondKey = `muvit_workout_session:${secondUserId}:${dayId}`;
    const firstWrite = createDeferred<void>();
    const started: string[] = [];
    let firstSerialized = JSON.stringify(draftSession);
    let secondSerialized = JSON.stringify(draftSession);

    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === firstKey) return firstSerialized;
      if (key === secondKey) return secondSerialized;
      return null;
    });
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      const saved = JSON.parse(value) as GuidedSession;
      if (key === firstKey) {
        started.push(`A:${saved.sets[1]?.repsDone ?? ''}`);
        await firstWrite.promise;
        firstSerialized = value;
        return;
      }
      if (key === secondKey) {
        started.push(`B:${saved.sets[1]?.repsDone ?? ''}`);
        secondSerialized = value;
      }
    });

    mockWorkoutDay();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const { view } = renderWithQueryClient(queryClient);

    try {
      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '7');
      await waitFor(() => expect(started).toContain('A:7'));

      authState.data = { user: { id: secondUserId, role: 'student' } };
      mockWorkoutDay();
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <LogWorkoutScreen />
        </QueryClientProvider>,
      );

      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '8');
      await waitFor(() => expect(started).toContain('B:8'));
      fireEvent.press(screen.getByRole('button', { name: 'Concluir série' }));
      expect(await screen.findByText('Supino inclinado concluído')).toBeTruthy();
      expect(
        queryClient.getQueryData<{ session: GuidedSession }>([
          'guided-workout-session',
          secondUserId,
          dayId,
        ])?.session.phase,
      ).toBe('exercise-complete');

      firstWrite.reject(new Error('falha tardia de A'));
      await waitFor(() =>
        expect(screen.queryByText(/Não foi possível salvar seu progresso/)).toBeNull(),
      );
      expect(secondSerialized).toContain('"repsDone":"8"');
    } finally {
      firstWrite.resolve();
    }
  });

  it('compartilha a fila same-key entre remontagens e remove depois do write antigo', async () => {
    const user = userEvent.setup();
    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const pendingWrite = createDeferred<void>();
    const events: string[] = [];
    let serialized: string | null = JSON.stringify(draftSession);

    storageState.getItem.mockImplementation(async (key: string) =>
      key === sessionKey ? serialized : null,
    );
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      events.push('save:start');
      await pendingWrite.promise;
      serialized = value;
      events.push('save:complete');
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key !== sessionKey) return;
      serialized = null;
      events.push('remove');
    });

    mockWorkoutDay();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const { view } = renderWithQueryClient(queryClient);

    try {
      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
      await waitFor(() => expect(events).toEqual(['save:start']));

      view.rerender(
        <QueryClientProvider client={queryClient}>
          <LogWorkoutScreen key="same-key-remount" />
        </QueryClientProvider>,
      );
      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      await waitFor(() => expect(navigationState.enabled).toBe(true));
      pressPreventedNavigation({ type: 'GO_BACK', key: 'same-key-remount' });
      fireEvent.press(screen.getByRole('button', { name: 'Encerrar treino' }));

      expect(events).toEqual(['save:start']);
      pendingWrite.resolve();
      await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
      expect(events).toEqual(['save:start', 'save:complete', 'remove']);
      expect(serialized).toBeNull();
    } finally {
      pendingWrite.resolve();
    }
  });

  it('vence um refetch stale iniciado antes do descarte e não ressuscita o rascunho', async () => {
    const user = userEvent.setup();
    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const guidedQueryKey = [
      'guided-workout-session',
      authState.data.user.id,
      routerState.dayId,
    ] as const;
    const pendingWrite = createDeferred<void>();
    const refetchSummary = createDeferred<unknown>();
    const refetchPlan = createDeferred<unknown>();
    const refetchLoad = createDeferred<string | null>();
    const events: string[] = [];
    let loadCount = 0;
    let serialized: string | null = JSON.stringify(draftSession);

    storageState.getItem.mockImplementation(async (key: string) => {
      if (key !== sessionKey) return null;
      loadCount += 1;
      return loadCount === 1 ? serialized : refetchLoad.promise;
    });
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      events.push(`save:${saved.sets[1]?.repsDone ?? ''}`);
      await pendingWrite.promise;
      serialized = value;
      events.push('save:complete');
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key !== sessionKey) return;
      serialized = null;
      events.push('remove');
    });
    apiState.request
      .mockResolvedValueOnce({ items: [{ ...planSummary, id: workoutPlan.id }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockImplementation((path: string) =>
        path === '/students/me/workout-plans' ? refetchSummary.promise : refetchPlan.promise,
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const { view } = renderWithQueryClient(queryClient);

    try {
      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
      await waitFor(() => expect(events).toEqual(['save:10']));

      view.rerender(
        <QueryClientProvider client={queryClient}>
          <LogWorkoutScreen key="stale-remount" />
        </QueryClientProvider>,
      );
      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      await waitFor(() =>
        expect(
          apiState.request.mock.calls.filter(([path]) => path === '/students/me/workout-plans')
            .length,
        ).toBeGreaterThanOrEqual(2),
      );
      await waitFor(() => expect(navigationState.enabled).toBe(true));
      pressPreventedNavigation({ type: 'GO_BACK', key: 'stale-discard' });
      await user.press(screen.getByRole('button', { name: 'Encerrar treino' }));
      expect(events).toEqual(['save:10']);

      pendingWrite.resolve();
      await waitFor(() => expect(events).toContain('remove'));
      refetchSummary.resolve({ items: [{ ...planSummary, id: workoutPlan.id }] });
      refetchPlan.resolve(workoutPlan);
      refetchLoad.resolve(null);
      await act(async () => undefined);
      await waitFor(() => expect(queryClient.getQueryData(guidedQueryKey)).toBeUndefined());

      expect(serialized).toBeNull();
      expect(storageState.setItem).toHaveBeenCalledTimes(1);
      expect(queryClient.getQueryData(guidedQueryKey)).toBeUndefined();
      expect(screen.queryByText('Série 2 de 2')).toBeNull();
    } finally {
      pendingWrite.resolve();
      refetchSummary.resolve({ items: [{ ...planSummary, id: workoutPlan.id }] });
      refetchPlan.resolve(workoutPlan);
    }
  });

  it('libera o lifecycle tombstonado e permite recriar a mesma chave', async () => {
    const user = userEvent.setup();
    const identity = `${authState.data.user.id}:${routerState.dayId}`;
    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const replacementSession: GuidedSession = {
      ...draftSession,
      sets: draftSession.sets.map((set, index) =>
        index === 1 ? { ...set, loadKg: '33', repsDone: '9' } : set,
      ),
    };
    const lifecycleDeletes = vi.fn();
    const originalDelete = Map.prototype.delete;
    const deleteSpy = vi.spyOn(Map.prototype, 'delete').mockImplementation(function (
      this: Map<unknown, unknown>,
      key: unknown,
    ) {
      const value = this.get(key);
      if (
        typeof value === 'object' &&
        value !== null &&
        'tombstoned' in value &&
        'queryLeases' in value
      ) {
        lifecycleDeletes(key);
      }
      return originalDelete.call(this, key);
    });
    let serialized: string | null = JSON.stringify(draftSession);

    storageState.getItem.mockImplementation(async (key: string) =>
      key === sessionKey ? serialized : null,
    );
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) serialized = null;
    });
    apiState.request.mockImplementation(async (path: string) => {
      if (path === '/students/me/workout-plans') {
        return { items: [{ ...planSummary, id: workoutPlan.id }] };
      }
      if (path === `/workout-plans/${workoutPlan.id}`) {
        return workoutPlan;
      }
      throw new Error(`unexpected request: ${path}`);
    });

    try {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
      });
      const { view } = renderWithQueryClient(queryClient);

      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      pressPreventedNavigation({ type: 'GO_BACK', key: 'lifecycle-cleanup' });
      await user.press(screen.getByRole('button', { name: 'Encerrar treino' }));
      expect(lifecycleDeletes).not.toHaveBeenCalled();
      authState.data = { user: { id: '', role: 'student' } };
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <LogWorkoutScreen />
        </QueryClientProvider>,
      );
      await waitFor(() => expect(lifecycleDeletes).toHaveBeenCalledWith(identity));

      serialized = JSON.stringify(replacementSession);
      authState.data = { user: { id: 'auth-user-id', role: 'student' } };
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <LogWorkoutScreen />
        </QueryClientProvider>,
      );
      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      expect(screen.getByLabelText('Carga utilizada')).toHaveProp('value', '33');
    } finally {
      deleteSpy.mockRestore();
    }
  });

  it('libera lifecycle normal em unmount e depois de Salvar e sair', async () => {
    const identity = `${authState.data.user.id}:${routerState.dayId}`;
    const lifecycleDeletes = vi.fn();
    const originalDelete = Map.prototype.delete;
    const deleteSpy = vi.spyOn(Map.prototype, 'delete').mockImplementation(function (
      this: Map<unknown, unknown>,
      key: unknown,
    ) {
      const value = this.get(key);
      if (
        typeof value === 'object' &&
        value !== null &&
        'tombstoned' in value &&
        'queryLeases' in value
      ) {
        lifecycleDeletes(key);
      }
      return originalDelete.call(this, key);
    });

    try {
      apiState.request.mockReset();
      mockWorkoutDay();
      const second = renderWithQueryClient();
      expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
      await act(async () => {
        navigationState.callback?.({
          data: { action: { type: 'GO_BACK', key: 'normal-save' } },
        });
      });
      fireEvent.press(screen.getByRole('button', { name: 'Salvar e sair' }));
      await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalled());
      await act(async () => {
        second.view.unmount();
      });
      await waitFor(() => expect(lifecycleDeletes).toHaveBeenCalledWith(identity));
    } finally {
      deleteSpy.mockRestore();
    }
  });

  it('não mantém lease em render abortado e tolera replay de effects', async () => {
    const abortedUserId = 'aborted-auth-user-id';
    const identity = `${abortedUserId}:${routerState.dayId}`;
    authState.data = { user: { id: abortedUserId, role: 'student' } };
    const lifecycleDeletes = vi.fn();
    const originalDelete = Map.prototype.delete;
    const deleteSpy = vi.spyOn(Map.prototype, 'delete').mockImplementation(function (
      this: Map<unknown, unknown>,
      key: unknown,
    ) {
      const value = this.get(key);
      if (
        typeof value === 'object' &&
        value !== null &&
        'tombstoned' in value &&
        'queryLeases' in value
      ) {
        lifecycleDeletes(key);
      }
      return originalDelete.call(this, key);
    });

    function AbortedScreen(): null {
      LogWorkoutScreen();
      return null;
    }

    try {
      const abortedView = render(
        <StrictMode>
          <QueryClientProvider client={new QueryClient()}>
            <AbortedScreen />
          </QueryClientProvider>
        </StrictMode>,
        { concurrentRoot: true },
      );
      await act(async () => {
        abortedView.unmount();
      });
      await waitFor(() => expect(lifecycleDeletes).toHaveBeenCalledWith(identity));
    } finally {
      deleteSpy.mockRestore();
    }
  });

  it('preserva a edição otimista quando um refetch devolve um snapshot antigo', async () => {
    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const guidedQueryKey = [
      'guided-workout-session',
      authState.data.user.id,
      routerState.dayId,
    ] as const;
    const refetchSummary = createDeferred<unknown>();
    const refetchPlan = createDeferred<unknown>();
    const refetchLoad = createDeferred<string | null>();
    let serialized: string | null = JSON.stringify(draftSession);
    let loadCount = 0;

    storageState.getItem.mockImplementation(async (key: string) => {
      if (key !== sessionKey) return null;
      loadCount += 1;
      return loadCount === 1 ? serialized : refetchLoad.promise;
    });
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key === sessionKey) serialized = value;
    });
    apiState.request
      .mockResolvedValueOnce({ items: [{ ...planSummary, id: workoutPlan.id }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockImplementation((path: string) =>
        path === '/students/me/workout-plans' ? refetchSummary.promise : refetchPlan.promise,
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    renderWithQueryClient(queryClient);

    expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
    const refetchPromise = queryClient.refetchQueries({ queryKey: guidedQueryKey, exact: true });
    await waitFor(() =>
      expect(
        apiState.request.mock.calls.filter(([path]) => path === '/students/me/workout-plans')
          .length,
      ).toBeGreaterThanOrEqual(2),
    );
    refetchSummary.resolve({ items: [{ ...planSummary, id: workoutPlan.id }] });
    await waitFor(() =>
      expect(
        apiState.request.mock.calls.filter(([path]) => String(path).startsWith('/workout-plans/'))
          .length,
      ).toBeGreaterThanOrEqual(2),
    );
    refetchPlan.resolve(workoutPlan);
    await waitFor(() => expect(loadCount).toBeGreaterThanOrEqual(2));

    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
    await waitFor(() => expect(JSON.parse(serialized ?? '').sets[1]?.repsDone).toBe('10'));

    refetchLoad.resolve(JSON.stringify(draftSession));
    await refetchPromise;

    await waitFor(() =>
      expect(screen.getByLabelText('Repetições realizadas')).toHaveProp('value', '10'),
    );
    expect(JSON.parse(serialized ?? '').sets[1]?.repsDone).toBe('10');
    expect(
      queryClient.getQueryData<{ session: GuidedSession }>(guidedQueryKey)?.session.sets[1]
        ?.repsDone,
    ).toBe('10');
  });

  it.each(structuralDayCases)(
    'adota o plano estrutural novo durante uma edição pendente: %s',
    async (_caseName, nextPlan) => {
      const guidedQueryKey = [
        'guided-workout-session',
        authState.data.user.id,
        routerState.dayId,
      ] as const;
      const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
      const refetchSummary = createDeferred<unknown>();
      const refetchPlan = createDeferred<unknown>();
      const pendingWrite = createDeferred<void>();
      const events: string[] = [];
      let serialized: string | null = JSON.stringify(draftSession);
      let writeCount = 0;

      storageState.getItem.mockImplementation(async (key: string) =>
        key === sessionKey ? serialized : null,
      );
      storageState.setItem.mockImplementation(async (key: string, value: string) => {
        if (key !== sessionKey) return;
        writeCount += 1;
        const saved = JSON.parse(value) as GuidedSession;
        events.push(`save:${saved.sets.length}`);
        if (writeCount === 1) await pendingWrite.promise;
        serialized = value;
      });
      storageState.removeItem.mockImplementation(async (key: string) => {
        if (key === sessionKey) {
          serialized = null;
          events.push('remove');
        }
      });
      apiState.request
        .mockResolvedValueOnce({ items: [{ ...planSummary, id: workoutPlan.id }] })
        .mockResolvedValueOnce(workoutPlan)
        .mockImplementation((path: string) =>
          path === '/students/me/workout-plans' ? refetchSummary.promise : refetchPlan.promise,
        );

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
      });
      renderWithQueryClient(queryClient);

      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      const refetchPromise = queryClient.refetchQueries({ queryKey: guidedQueryKey, exact: true });
      await waitFor(() =>
        expect(
          apiState.request.mock.calls.filter(([path]) => path === '/students/me/workout-plans')
            .length,
        ).toBeGreaterThanOrEqual(2),
      );
      refetchSummary.resolve({ items: [{ ...planSummary, id: workoutPlan.id }] });
      await waitFor(() =>
        expect(
          apiState.request.mock.calls.filter(([path]) => String(path).startsWith('/workout-plans/'))
            .length,
        ).toBeGreaterThanOrEqual(2),
      );

      fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
      await waitFor(() => expect(events).toEqual(['save:3']));
      refetchPlan.resolve(nextPlan);
      pendingWrite.resolve();
      await refetchPromise;

      const expectedSets = nextPlan.days[0].exercises.reduce(
        (total, exercise) => total + exercise.sets,
        0,
      );
      await waitFor(() =>
        expect(
          queryClient.getQueryData<{ day: WorkoutPlan['days'][number]; session: GuidedSession }>(
            guidedQueryKey,
          )?.day,
        ).toEqual(nextPlan.days[0]),
      );
      expect(events).toEqual(['save:3', 'remove', `save:${expectedSets}`]);
      expect(JSON.parse(serialized ?? '').sets).toHaveLength(expectedSets);
      expect(JSON.parse(serialized ?? '').sets[0]?.repsDone).toBe('');
      await waitFor(() =>
        expect(screen.getByText(`Série 1 de ${nextPlan.days[0].exercises[0]?.sets}`)).toBeTruthy(),
      );
      expect(screen.queryByText('Série 2 de 2')).toBeNull();
    },
  );

  it('não deixa uma edição do draft incompatível vencer a recriação estrutural', async () => {
    const guidedQueryKey = [
      'guided-workout-session',
      authState.data.user.id,
      routerState.dayId,
    ] as const;
    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const nextPlan = planWithExercises([workoutPlan.days[0].exercises[0]]);
    const refetchSummary = createDeferred<unknown>();
    const refetchPlan = createDeferred<unknown>();
    const firstWriteDone = createDeferred<void>();
    const removeDone = createDeferred<void>();
    const replacementSaveDone = createDeferred<void>();
    const events: string[] = [];
    let serialized: string | null = JSON.stringify(draftSession);
    let writeCount = 0;

    storageState.getItem.mockImplementation(async (key: string) =>
      key === sessionKey ? serialized : null,
    );
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key !== sessionKey) return;
      events.push('remove:start');
      await removeDone.promise;
      serialized = null;
      events.push('remove:done');
    });
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      writeCount += 1;
      const marker = `save:${writeCount}:${saved.sets.length}:${saved.sets[1]?.repsDone ?? ''}`;
      events.push(marker);
      if (writeCount === 1) await firstWriteDone.promise;
      if (saved.sets.length === 2) await replacementSaveDone.promise;
      serialized = value;
    });
    apiState.request
      .mockResolvedValueOnce({ items: [{ ...planSummary, id: workoutPlan.id }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockImplementation((path: string) =>
        path === '/students/me/workout-plans' ? refetchSummary.promise : refetchPlan.promise,
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    renderWithQueryClient(queryClient);

    expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
    const refetchPromise = queryClient.refetchQueries({ queryKey: guidedQueryKey, exact: true });
    refetchSummary.resolve({ items: [{ ...planSummary, id: workoutPlan.id }] });
    await waitFor(() =>
      expect(
        apiState.request.mock.calls.filter(([path]) => String(path).startsWith('/workout-plans/'))
          .length,
      ).toBeGreaterThanOrEqual(2),
    );
    refetchPlan.resolve(nextPlan);
    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
    await waitFor(() => expect(events).toContain('save:1:3:10'));
    firstWriteDone.resolve();
    await waitFor(() => expect(events).toContain('remove:start'));

    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '77');
    removeDone.resolve();
    await waitFor(() => expect(events).toContain('save:2:2:'));
    replacementSaveDone.resolve();
    await refetchPromise;
    await act(async () => undefined);

    expect(events.some((event) => event === 'save:3:3:77')).toBe(false);
    expect(JSON.parse(serialized ?? '').sets).toHaveLength(2);
    expect(queryClient.getQueryData(guidedQueryKey)).toMatchObject({
      day: nextPlan.days[0],
    });
  });

  it('não reexpõe o draft incompatível quando a recriação falha depois do remove', async () => {
    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const nextPlan = planWithExercises([workoutPlan.days[0].exercises[0]]);
    const refetchSummary = createDeferred<unknown>();
    const refetchPlan = createDeferred<unknown>();
    const firstWriteDone = createDeferred<void>();
    const replacementSave = createDeferred<void>();
    replacementSave.promise.catch(() => undefined);
    let serialized: string | null = JSON.stringify(draftSession);
    let writeCount = 0;

    storageState.getItem.mockImplementation(async (key: string) =>
      key === sessionKey ? serialized : null,
    );
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) serialized = null;
    });
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      writeCount += 1;
      if (writeCount === 1) await firstWriteDone.promise;
      if (saved.sets.length === 2) await replacementSave.promise;
      serialized = value;
    });
    apiState.request
      .mockResolvedValueOnce({ items: [{ ...planSummary, id: workoutPlan.id }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockImplementation((path: string) =>
        path === '/students/me/workout-plans' ? refetchSummary.promise : refetchPlan.promise,
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    renderWithQueryClient(queryClient);

    expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
    const refetchPromise = queryClient.refetchQueries({
      queryKey: ['guided-workout-session', authState.data.user.id, routerState.dayId],
      exact: true,
    });
    refetchSummary.resolve({ items: [{ ...planSummary, id: workoutPlan.id }] });
    await waitFor(() =>
      expect(
        apiState.request.mock.calls.filter(([path]) => String(path).startsWith('/workout-plans/'))
          .length,
      ).toBeGreaterThanOrEqual(2),
    );
    refetchPlan.resolve(nextPlan);
    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
    await waitFor(() => expect(storageState.setItem).toHaveBeenCalledTimes(1));
    firstWriteDone.resolve();
    await waitFor(() => expect(storageState.removeItem).toHaveBeenCalledWith(sessionKey));
    replacementSave.reject(new Error('replacement save failed'));
    await act(async () => {
      await refetchPromise;
    });

    await waitFor(() => expect(screen.getByText('Treino indisponível')).toBeTruthy());
    expect(screen.queryByLabelText('Repetições realizadas')).toBeNull();
    expect(storageState.setItem).toHaveBeenCalledTimes(2);
    expect(serialized).toBeNull();
  });

  it('bloqueia o primeiro commit de uma identidade nova antes do reset passivo', async () => {
    const secondUserId = 'other-auth-user-id';
    const secondDayId = '88888888-8888-4888-8888-888888888888';
    const secondSessionKey = `muvit_workout_session:${secondUserId}:${secondDayId}`;
    const secondDay = {
      ...workoutPlan.days[0],
      id: secondDayId,
      exercises: workoutPlan.days[0].exercises.map((exercise) => ({
        ...exercise,
        workoutDayId: secondDayId,
      })),
    };
    const secondPlan: WorkoutPlan = { ...workoutPlan, days: [secondDay] };
    const secondSummary = createDeferred<unknown>();
    const secondPlanResponse = createDeferred<unknown>();
    const writes: Array<{ key: string; value: string }> = [];
    const preEffect = { foundField: false };

    function PreEffectHarness({ probe }: { probe: boolean }) {
      useLayoutEffect(() => {
        if (!probe) return;
        const repsField = screen.queryByLabelText('Repetições realizadas');
        if (!repsField) return;
        preEffect.foundField = true;
        fireEvent.changeText(repsField, '99');
      }, [probe]);
      return <LogWorkoutScreen />;
    }

    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`) {
        return JSON.stringify(draftSession);
      }
      return null;
    });
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      writes.push({ key, value });
    });
    storageState.removeItem.mockResolvedValue(undefined);
    apiState.request
      .mockResolvedValueOnce({ items: [{ ...planSummary, id: workoutPlan.id }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockImplementation((path: string) =>
        path === '/students/me/workout-plans' ? secondSummary.promise : secondPlanResponse.promise,
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    const view = render(
      <QueryClientProvider client={queryClient}>
        <PreEffectHarness probe={false} />
      </QueryClientProvider>,
    );

    try {
      expect(await screen.findByText('Série 2 de 2')).toBeTruthy();
      authState.data = { user: { id: secondUserId, role: 'student' } };
      routerState.dayId = secondDayId;
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <PreEffectHarness probe />
        </QueryClientProvider>,
      );
      await act(async () => undefined);

      expect(preEffect.foundField).toBe(false);
      expect(screen.getByText('Carregando treino')).toBeTruthy();
      expect(screen.queryByLabelText('Repetições realizadas')).toBeNull();
      expect(writes).toEqual([]);
      expect(storageState.removeItem).not.toHaveBeenCalledWith(secondSessionKey);
    } finally {
      secondSummary.resolve({ items: [{ ...planSummary, id: secondPlan.id }] });
      secondPlanResponse.resolve(secondPlan);
    }
  });

  it('aguarda a edição pendente antes de concluir a série', async () => {
    mockWorkoutDay();
    mockStatefulDraftStorage();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const pendingWrite = createDeferred<void>();
    const events: string[] = [];
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      events.push(`${saved.phase}:${saved.sets[0]?.repsDone ?? ''}`);
      await pendingWrite.promise;
    });

    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
    await waitFor(() => expect(events).toEqual(['set:10']));
    fireEvent.press(screen.getByRole('button', { name: 'Concluir série' }));
    expect(events).toEqual(['set:10']);
    expect(screen.queryByText('Descanso')).toBeNull();

    pendingWrite.resolve();
    expect(await screen.findByText('Descanso')).toBeTruthy();
    expect(events).toEqual(['set:10', 'rest:10']);
  });

  it('aguarda a edição pendente antes de Salvar e sair', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockStatefulDraftStorage();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const pendingWrite = createDeferred<void>();
    const events: string[] = [];
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      events.push(`${saved.phase}:${saved.sets[0]?.repsDone ?? ''}`);
      await pendingWrite.promise;
    });

    pressPreventedNavigation({ type: 'GO_BACK', key: 'queued-save' });
    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
    await waitFor(() => expect(events).toEqual(['set:10']));
    await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));
    expect(events).toEqual(['set:10']);
    expect(navigationState.dispatch).not.toHaveBeenCalled();

    pendingWrite.resolve();
    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
    expect(events).toEqual(['set:10', 'set:10']);
  });

  it('mantém a fila utilizável após falha de save em background', async () => {
    mockWorkoutDay();
    const storage = mockStatefulDraftStorage();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    let serialized = storage.getSerialized();
    let writes = 0;
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      writes += 1;
      if (writes === 1) throw new Error('falha no save em background');
      serialized = value;
    });

    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '1');
    await waitFor(() =>
      expect(screen.getAllByText(/Não foi possível salvar seu progresso/).length).toBeGreaterThan(
        0,
      ),
    );
    fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
    await waitFor(() => expect(JSON.parse(serialized ?? '').sets[0]?.repsDone).toBe('10'));
    expect(screen.queryByText(/Não foi possível salvar seu progresso/)).toBeNull();
  });

  it('aguarda a persistência de edição antes de descartar e não grava depois da remoção', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockStatefulDraftStorage();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const pending = createDeferred<void>();
    const events: string[] = [];
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      events.push(`save:${saved.sets[0]?.repsDone ?? ''}`);
      await pending.promise;
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) events.push('remove');
    });

    pressPreventedNavigation({ type: 'GO_BACK', key: 'queued-discard' });
    act(() => {
      fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '10');
    });
    await waitFor(() => expect(events).toEqual(['save:10']));
    fireEvent.press(screen.getByRole('button', { name: 'Encerrar treino' }));

    expect(events).toEqual(['save:10']);
    expect(navigationState.dispatch).not.toHaveBeenCalled();
    pending.resolve();

    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
    expect(events).toEqual(['save:10', 'remove']);
  });

  it('aguarda a persistência de edição antes de finalizar e envia o valor final sem gravar depois da remoção', async () => {
    const editingSession: GuidedSession = { ...draftSession, currentSetIndex: 0 };
    const readyEditedSession: GuidedSession = {
      ...readySession,
      sets: readySession.sets.map((set, index) => (index === 0 ? { ...set, repsDone: '11' } : set)),
    };
    mockWorkoutDay();
    mockDraftStorage(editingSession);
    mockSuccessfulFinish();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    renderWithQueryClient(queryClient);
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const pending = createDeferred<void>();
    const events: string[] = [];
    storageState.setItem.mockImplementation(async (key: string, value: string) => {
      if (key !== sessionKey) return;
      const saved = JSON.parse(value) as GuidedSession;
      events.push(`save:${saved.sets[0]?.repsDone ?? ''}`);
      await pending.promise;
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) events.push('remove');
    });

    act(() => {
      fireEvent.changeText(screen.getByLabelText('Repetições realizadas'), '11');
    });
    act(() => {
      queryClient.setQueryData<{ day: WorkoutPlan['days'][number]; session: GuidedSession }>(
        ['guided-workout-session', authState.data.user.id, routerState.dayId],
        (current) => (current ? { ...current, session: readyEditedSession } : current),
      );
    });
    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));

    expect(apiState.request).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['save:11']);
    pending.resolve();

    await waitFor(() => expect(screen.getAllByText('Treino concluído').length).toBeGreaterThan(0));
    const finishRequests = apiState.request.mock.calls.filter(
      ([path]) => path === '/workout-logs' || path === '/workout-logs/log-id/finish',
    );
    expect(finishRequests).toHaveLength(2);
    const finishCall = apiState.request.mock.calls.find(
      ([path]) => path === '/workout-logs/log-id/finish',
    );
    const finishInit = finishCall?.[1] as RequestInit | undefined;
    const finishBody = JSON.parse(String(finishInit?.body)) as {
      sets: Array<{ repsDone: number | undefined }>;
    };
    expect(finishBody.sets[0]?.repsDone).toBe(11);
    expect(events).toEqual(['save:11', 'remove']);
  });

  it('remove o cache ao concluir e não ressuscita o resumo como rascunho', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockStatefulDraftStorage(readySession);
    mockSuccessfulFinish();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { view } = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));
    await waitFor(() => expect(screen.getAllByText('Treino concluído').length).toBeGreaterThan(0));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['today-workout', authState.data.user.id],
    });

    mockWorkoutDay();
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen key="remount-after-finish" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
  });

  it('conclui A e limpa seus caches mesmo quando a identidade atual já é B', async () => {
    const user = userEvent.setup();
    const firstUserId = authState.data.user.id;
    const secondUserId = 'other-auth-user-id';
    const dayId = routerState.dayId;
    const firstKey = `muvit_workout_session:${firstUserId}:${dayId}`;
    const secondKey = `muvit_workout_session:${secondUserId}:${dayId}`;
    const guidedFirstKey = ['guided-workout-session', firstUserId, dayId] as const;
    const guidedSecondKey = ['guided-workout-session', secondUserId, dayId] as const;
    const finishStart = createDeferred<{ id: string }>();
    let firstSerialized: string | null = JSON.stringify(readySession);
    let secondSerialized: string | null = JSON.stringify(readySession);

    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === firstKey) return firstSerialized;
      if (key === secondKey) return secondSerialized;
      return null;
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === firstKey) firstSerialized = null;
      if (key === secondKey) secondSerialized = null;
    });
    apiState.request.mockImplementation(async (path: string) => {
      if (path === '/students/me/workout-plans') {
        return { items: [{ ...planSummary, id: workoutPlan.id }] };
      }
      if (path === `/workout-plans/${workoutPlan.id}`) return workoutPlan;
      if (path === '/workout-logs') return finishStart.promise;
      if (path === '/workout-logs/a-log-id/finish') return undefined;
      throw new Error(`unexpected request: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { view } = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));
    await waitFor(() =>
      expect(apiState.request).toHaveBeenCalledWith('/workout-logs', expect.anything()),
    );

    authState.data = { user: { id: secondUserId, role: 'student' } };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();
    await waitFor(() => expect(queryClient.getQueryData(guidedSecondKey)).toBeDefined());
    expect(queryClient.getQueryData(guidedFirstKey)).toBeDefined();

    finishStart.resolve({ id: 'a-log-id' });
    await waitFor(() => expect(storageState.removeItem).toHaveBeenCalledWith(firstKey));
    await waitFor(() => expect(queryClient.getQueryData(guidedFirstKey)).toBeUndefined());

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['today-workout', firstUserId] });
    expect(screen.getByText('Pronto para finalizar')).toBeTruthy();
    const secondSummaryCallsBeforeRetry = apiState.request.mock.calls.filter(
      ([path]) => path === '/students/me/workout-plans',
    ).length;
    await queryClient.invalidateQueries({ queryKey: guidedSecondKey, exact: true });
    await waitFor(() =>
      expect(
        apiState.request.mock.calls.filter(([path]) => path === '/students/me/workout-plans')
          .length,
      ).toBeGreaterThan(secondSummaryCallsBeforeRetry),
    );
    expect(secondSerialized).toBe(JSON.stringify(readySession));
  });

  it('limpa a conclusão de A após a sequência A-B-A sem ressuscitar o draft', async () => {
    const user = userEvent.setup();
    const firstUserId = authState.data.user.id;
    const secondUserId = 'other-auth-user-id';
    const dayId = routerState.dayId;
    const firstKey = `muvit_workout_session:${firstUserId}:${dayId}`;
    const secondKey = `muvit_workout_session:${secondUserId}:${dayId}`;
    const guidedFirstKey = ['guided-workout-session', firstUserId, dayId] as const;
    const finishStart = createDeferred<{ id: string }>();
    let firstSerialized: string | null = JSON.stringify(readySession);
    let secondSerialized: string | null = JSON.stringify(readySession);

    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === firstKey) return firstSerialized;
      if (key === secondKey) return secondSerialized;
      return null;
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === firstKey) firstSerialized = null;
      if (key === secondKey) secondSerialized = null;
    });
    apiState.request.mockImplementation(async (path: string) => {
      if (path === '/students/me/workout-plans') {
        return { items: [{ ...planSummary, id: workoutPlan.id }] };
      }
      if (path === `/workout-plans/${workoutPlan.id}`) return workoutPlan;
      if (path === '/workout-logs') return finishStart.promise;
      if (path === '/workout-logs/a-log-id/finish') return undefined;
      throw new Error(`unexpected request: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { view } = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));
    await waitFor(() =>
      expect(apiState.request).toHaveBeenCalledWith('/workout-logs', expect.anything()),
    );

    authState.data = { user: { id: secondUserId, role: 'student' } };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();

    authState.data = { user: { id: firstUserId, role: 'student' } };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen />
      </QueryClientProvider>,
    );
    await act(async () => undefined);
    expect(firstSerialized).toBe(JSON.stringify(readySession));

    finishStart.resolve({ id: 'a-log-id' });
    await waitFor(() => expect(storageState.removeItem).toHaveBeenCalledWith(firstKey));
    await waitFor(() => expect(queryClient.getQueryData(guidedFirstKey)).toBeUndefined());
    expect(firstSerialized).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['today-workout', firstUserId] });
    expect(screen.queryByText('Série 1 de 2')).toBeNull();
    expect(secondSerialized).toBe(JSON.stringify(readySession));
  });

  it('publica o terminal de A quando o finish resolve após A-B-A', async () => {
    const user = userEvent.setup();
    const firstUserId = authState.data.user.id;
    const secondUserId = 'other-auth-user-id';
    const dayId = routerState.dayId;
    const firstKey = `muvit_workout_session:${firstUserId}:${dayId}`;
    const secondKey = `muvit_workout_session:${secondUserId}:${dayId}`;
    const guidedFirstKey = ['guided-workout-session', firstUserId, dayId] as const;
    const finishStart = createDeferred<{ id: string }>();
    let firstSerialized: string | null = JSON.stringify(readySession);
    let secondSerialized: string | null = JSON.stringify(readySession);

    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === firstKey) return firstSerialized;
      if (key === secondKey) return secondSerialized;
      return null;
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === firstKey) firstSerialized = null;
      if (key === secondKey) secondSerialized = null;
    });
    apiState.request.mockImplementation(async (path: string) => {
      if (path === '/students/me/workout-plans') {
        return { items: [{ ...planSummary, id: workoutPlan.id }] };
      }
      if (path === `/workout-plans/${workoutPlan.id}`) return workoutPlan;
      if (path === '/workout-logs') return finishStart.promise;
      if (path === '/workout-logs/a-log-id/finish') return undefined;
      throw new Error(`unexpected request: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { view } = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));
    await waitFor(() =>
      expect(apiState.request).toHaveBeenCalledWith('/workout-logs', expect.anything()),
    );

    authState.data = { user: { id: secondUserId, role: 'student' } };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();

    authState.data = { user: { id: firstUserId, role: 'student' } };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <LogWorkoutScreen />
      </QueryClientProvider>,
    );

    finishStart.resolve({ id: 'a-log-id' });
    await waitFor(() => expect(storageState.removeItem).toHaveBeenCalledWith(firstKey));
    await waitFor(() => expect(queryClient.getQueryData(guidedFirstKey)).toBeUndefined());
    await waitFor(() => expect(screen.getAllByText('Treino concluído').length).toBeGreaterThan(0));

    expect(firstSerialized).toBeNull();
    expect(secondSerialized).toBe(JSON.stringify(readySession));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['today-workout', firstUserId] });
    expect(screen.queryByText('Treino indisponível')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
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
    await waitFor(() =>
      expect(screen.getAllByText(/Não foi possível salvar seu progresso/).length).toBeGreaterThan(
        0,
      ),
    );
  });

  it('mantém texto neutro na saída quando o salvamento inicial falhou', async () => {
    mockWorkoutDay();
    storageState.setItem.mockRejectedValue(new Error('storage indisponível'));
    renderWithQueryClient();

    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
    pressPreventedNavigation({ type: 'GO_BACK', key: 'initial-failure' });

    expect(await screen.findByText('Escolha como deseja sair.')).toBeTruthy();
    expect(screen.queryByText('Seu progresso até aqui foi salvo.')).toBeNull();
  });

  it('mantém a saída aberta e sem navegação quando Salvar e sair falha', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    storageState.setItem.mockRejectedValueOnce(new Error('storage indisponível'));
    pressPreventedNavigation({ type: 'GO_BACK', key: 'save-failure' });
    await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));

    expect(screen.getByText('Sair da sessão')).toBeTruthy();
    expect(screen.getByText('Escolha como deseja sair.')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByText(/Não foi possível salvar seu progresso/).length).toBeGreaterThan(
        0,
      ),
    );
    expect(navigationState.dispatch).not.toHaveBeenCalled();
  });

  it('não inicia um segundo salvamento enquanto salvar e sair está pendente', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockStatefulDraftStorage();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const initialSaveCount = storageState.setItem.mock.calls.filter(
      ([key]) => key === sessionKey,
    ).length;
    const pending = createDeferred<void>();
    storageState.setItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) return pending.promise;
    });

    pressPreventedNavigation({ type: 'GO_BACK', key: 'pending-save' });
    await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));
    await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));

    expect(storageState.setItem.mock.calls.filter(([key]) => key === sessionKey)).toHaveLength(
      initialSaveCount + 1,
    );
    expect(navigationState.dispatch).not.toHaveBeenCalled();

    pending.resolve();
    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
  });

  it('não inicia um segundo descarte enquanto Encerrar treino está pendente', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockStatefulDraftStorage();
    renderWithQueryClient();
    expect(await screen.findByText('Série 1 de 2')).toBeTruthy();

    const sessionKey = `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`;
    const pending = createDeferred<void>();
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) return pending.promise;
    });

    pressPreventedNavigation({ type: 'GO_BACK', key: 'pending-discard' });
    await user.press(screen.getByRole('button', { name: 'Encerrar treino' }));
    await user.press(screen.getByRole('button', { name: 'Encerrar treino' }));

    expect(storageState.removeItem.mock.calls.filter(([key]) => key === sessionKey)).toHaveLength(
      1,
    );
    expect(navigationState.dispatch).not.toHaveBeenCalled();

    pending.resolve();
    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
  });

  it('não envia duas conclusões enquanto a API está pendente', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockDraftStorage(readySession);
    renderWithQueryClient();
    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();

    const pending = createDeferred<unknown>();
    apiState.request.mockReset().mockImplementation(() => pending.promise);
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));

    expect(apiState.request).toHaveBeenCalledOnce();
    expect(storageState.removeItem).not.toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );

    pending.resolve({ id: 'log-id' });
    await waitFor(() => expect(screen.getAllByText('Treino concluído').length).toBeGreaterThan(0));
  });

  it('recusa finalizar uma fase pronta que ainda tenha séries incompletas', async () => {
    const user = userEvent.setup();
    mockWorkoutDay();
    mockDraftStorage(incompleteReadySession);
    renderWithQueryClient();
    expect(await screen.findByText('Pronto para finalizar')).toBeTruthy();

    apiState.request.mockReset();
    await user.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));

    expect(apiState.request).not.toHaveBeenCalled();
    expect(storageState.removeItem).not.toHaveBeenCalledWith(
      `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
    );
  });

  const draftMismatchCases: Array<[string, WorkoutPlan, number]> = [
    ['remoção de exercício', planWithExercises([workoutPlan.days[0].exercises[0]]), 2],
    [
      'reordenação de exercícios',
      planWithExercises([...workoutPlan.days[0].exercises].reverse()),
      3,
    ],
    [
      'redução de séries',
      planWithExercises([
        { ...workoutPlan.days[0].exercises[0], sets: 1 },
        workoutPlan.days[0].exercises[1],
      ]),
      2,
    ],
  ];

  it.each(draftMismatchCases)(
    'recria o rascunho quando há %s no plano atual',
    async (_caseName, plan, expectedSetCount) => {
      mockWorkoutDay(plan);
      const storage = mockStatefulDraftStorage(draftSession);
      renderWithQueryClient();

      expect(await screen.findByText(/Série 1 de/)).toBeTruthy();
      await waitFor(() =>
        expect(storageState.removeItem).toHaveBeenCalledWith(
          `muvit_workout_session:${authState.data.user.id}:${routerState.dayId}`,
        ),
      );
      const serialized = storage.getSerialized();
      expect(serialized).toEqual(expect.any(String));
      const recreated = JSON.parse(serialized ?? '') as GuidedSession;
      expect(recreated.sets).toHaveLength(expectedSetCount);
      expect(recreated.currentExerciseIndex).toBe(0);
      expect(recreated.currentSetIndex).toBe(0);
    },
  );

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
