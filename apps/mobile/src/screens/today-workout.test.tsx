import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiTransportError } from '../lib/api';
import { todayIsoDate } from '../lib/date';
import { workoutSessionKey } from '../lib/workout-session-storage';
import { TodayWorkoutScreen } from './today-workout';

const authState = vi.hoisted(() => ({ userId: 'auth-user-a' as string | null }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const linkState = vi.hoisted(() => ({ hrefs: [] as string[] }));
const routerState = vi.hoisted(() => ({ pushes: [] as unknown[] }));
const storageState = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: authState.userId } } }),
  },
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: storageState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

vi.mock('expo-router', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => {
    linkState.hrefs.push(href);
    return children;
  },
  useNavigation: () => ({ addListener: () => () => undefined }),
  router: {
    push: (target: unknown) => routerState.pushes.push(target),
  },
}));

function renderWithQueryClient(queryClient = createQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TodayWorkoutScreen />
    </QueryClientProvider>,
  );
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const activeWorkout = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  studentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  trainerId: null,
  name: 'Plano A',
  startDate: null,
  endDate: null,
  status: 'active' as const,
  notes: null,
  createdAt: '2026-08-15T12:00:00.000Z',
  days: [
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      label: 'Treino A',
      dayOrder: 0,
      planId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      exercises: [
        {
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          workoutDayId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          exerciseId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          exerciseOrder: 0,
          sets: 2,
          reps: '10',
          restSeconds: 60,
          loadKg: 20,
          notes: null,
          tempo: null,
          exercise: {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            name: 'Supino',
            muscleGroup: 'chest',
          },
        },
        {
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          workoutDayId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          exerciseId: '11111111-1111-4111-8111-111111111111',
          exerciseOrder: 1,
          sets: 1,
          reps: '12',
          restSeconds: 45,
          loadKg: null,
          notes: null,
          tempo: null,
          exercise: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Remada',
            muscleGroup: 'costas',
          },
        },
      ],
    },
  ],
};
const activeWorkoutSummary = {
  id: activeWorkout.id,
  studentId: activeWorkout.studentId,
  trainerId: activeWorkout.trainerId,
  name: activeWorkout.name,
  startDate: activeWorkout.startDate,
  endDate: activeWorkout.endDate,
  status: activeWorkout.status,
  createdAt: activeWorkout.createdAt,
};

const emptyStateRefreshScenarios = [
  {
    name: 'sem plano ativo',
    activePlan: false,
    title: 'Sem plano ativo',
    description: 'Seu professor ainda não publicou um plano de treino.',
  },
  {
    name: 'dia de recuperação',
    activePlan: true,
    title: 'Hoje é dia de recuperação',
    description: 'Aproveite para descansar e se preparar para o próximo treino.',
  },
] as const;

function emptyWorkoutResponse(path: string, activePlan: boolean): Promise<unknown> {
  if (path === '/students/me/workout-plans') {
    return Promise.resolve({ items: activePlan ? [activeWorkoutSummary] : [] });
  }
  if (path === `/workout-plans/${activeWorkout.id}`) {
    return Promise.resolve({ ...activeWorkout, days: [] });
  }
  if (path === '/students/me/workout-logs?limit=30') {
    return Promise.resolve({ items: [] });
  }
  return Promise.reject(new Error('Requisição inesperada'));
}

const cachedWorkout = {
  plan: {
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
            sets: 1,
            reps: '10',
            restSeconds: 60,
            loadKg: null,
            tempo: null,
            notes: null,
            exercise: {
              id: '33333333-3333-4333-8333-333333333333',
              name: 'Supino',
              muscleGroup: 'Peito',
            },
          },
        ],
      },
    ],
  },
  day: {
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
        sets: 1,
        reps: '10',
        restSeconds: 60,
        loadKg: null,
        tempo: null,
        notes: null,
        exercise: {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Supino',
          muscleGroup: 'Peito',
        },
      },
    ],
  },
};

describe('TodayWorkoutScreen', () => {
  beforeEach(() => {
    authState.userId = 'auth-user-a';
    apiState.request.mockReset();
    storageState.getItem.mockReset();
    storageState.removeItem.mockReset();
    storageState.setItem.mockReset();
    linkState.hrefs = [];
    routerState.pushes = [];
    storageState.getItem.mockResolvedValue(null);
    storageState.removeItem.mockResolvedValue(undefined);
    storageState.setItem.mockResolvedValue(undefined);
  });

  it('mantém o cabeçalho no estado sem plano ativo', async () => {
    apiState.request.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Sem plano ativo')).toBeTruthy();
    expect(screen.getByText('Seu professor ainda não publicou um plano de treino.')).toBeTruthy();
    expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
    expect(screen.getByText('Encontre seu próximo movimento.')).toBeTruthy();
  });

  it('mantém o cabeçalho no estado de recuperação', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce({ ...activeWorkout, days: [] })
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Hoje é dia de recuperação')).toBeTruthy();
    expect(
      screen.getByText('Aproveite para descansar e se preparar para o próximo treino.'),
    ).toBeTruthy();
    expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
  });

  it.each(emptyStateRefreshScenarios)(
    'mantém o estado vazio de $name durante falha de atualização e retry',
    async ({ activePlan, description, title }) => {
      const queryClient = createQueryClient();
      apiState.request.mockImplementation((path: string) => emptyWorkoutResponse(path, activePlan));

      renderWithQueryClient(queryClient);

      expect(await screen.findByText(title)).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
      apiState.request.mockRejectedValueOnce(new ApiError('indisponível', 503));

      await act(async () => {
        await queryClient.refetchQueries({ queryKey: ['today-workout', 'auth-user-a'] });
      });

      expect(await screen.findByText('Não foi possível atualizar')).toBeTruthy();
      expect(
        screen.getByText('O estado de hoje foi mantido. Tente atualizar novamente.'),
      ).toBeTruthy();
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();

      const pendingRetry = createDeferred<unknown>();
      apiState.request.mockReset();
      apiState.request.mockImplementation((path: string) =>
        path === '/students/me/workout-plans'
          ? pendingRetry.promise
          : emptyWorkoutResponse(path, activePlan),
      );
      const retry = screen.getByRole('button', { name: 'Tentar novamente' });

      await act(async () => {
        fireEvent.press(retry);
        fireEvent.press(retry);
      });

      const updatingAction = await screen.findByRole('button', { name: 'Atualizando…' });
      expect(updatingAction.props.accessibilityState?.disabled).toBe(true);
      expect(
        screen.getByText('O estado de hoje foi mantido. Tente atualizar novamente.'),
      ).toBeTruthy();
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
      expect(screen.queryByText('Carregando treino')).toBeNull();
      expect(apiState.request).toHaveBeenCalledTimes(1);

      await act(async () =>
        pendingRetry.resolve({ items: activePlan ? [activeWorkoutSummary] : [] }),
      );

      await waitFor(() => expect(screen.queryByText('Não foi possível atualizar')).toBeNull());
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
    },
  );

  it('mostra o treino disponível e abre a visão geral pelo CTA', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Plano A · Treino A')).toBeTruthy();
    expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
    expect(linkState.hrefs).toContain(`/log/${activeWorkout.days[0].id}`);
    expect(storageState.getItem).toHaveBeenCalledWith(
      workoutSessionKey('auth-user-a', activeWorkout.days[0].id),
    );
    await waitFor(() => expect(screen.queryByText('Sem treino ativo')).toBeNull());
  });

  it('mantém o cabeçalho durante a consulta inicial e mostra o treino após o sucesso', async () => {
    const pendingSummaries = createDeferred<unknown>();
    apiState.request.mockImplementation((path: string) => {
      if (path === '/students/me/workout-plans') return pendingSummaries.promise;
      if (path === `/workout-plans/${activeWorkout.id}`) return Promise.resolve(activeWorkout);
      return Promise.resolve({ items: [] });
    });

    renderWithQueryClient();

    expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
    expect(screen.getByText('Encontre seu próximo movimento.')).toBeTruthy();
    expect(await screen.findByText('Carregando treino')).toBeTruthy();

    await act(async () => pendingSummaries.resolve({ items: [activeWorkoutSummary] }));

    expect(await screen.findByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
  });

  it('recupera erro inicial com um retry e um único indicador de loading', async () => {
    const initialFailure = createDeferred<unknown>();
    apiState.request.mockReturnValueOnce(initialFailure.promise);

    renderWithQueryClient();

    expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
    expect(await screen.findByText('Carregando treino')).toBeTruthy();

    await act(async () => initialFailure.reject(new ApiError('indisponível', 503)));

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    const pendingRetry = createDeferred<unknown>();
    apiState.request.mockReset();
    apiState.request.mockImplementation((path: string) => {
      if (path === '/students/me/workout-plans') return pendingRetry.promise;
      if (path === `/workout-plans/${activeWorkout.id}`) return Promise.resolve(activeWorkout);
      return Promise.resolve({ items: [] });
    });
    const retry = screen.getByRole('button', { name: 'Tentar novamente' });

    await act(async () => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });

    expect(await screen.findByText('Carregando treino')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    expect(apiState.request).toHaveBeenCalledTimes(1);

    await act(async () => pendingRetry.resolve({ items: [activeWorkoutSummary] }));

    expect(await screen.findByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
  });

  it('preserva o conteúdo após falha de atualização e bloqueia o retry contextual duplicado', async () => {
    const queryClient = createQueryClient();
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });
    renderWithQueryClient(queryClient);

    expect(await screen.findByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
    apiState.request.mockRejectedValueOnce(new ApiError('indisponível', 503));

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['today-workout', 'auth-user-a'] });
    });

    expect(await screen.findByText('Não foi possível atualizar')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();

    const pendingRetry = createDeferred<unknown>();
    apiState.request.mockReset();
    apiState.request.mockImplementation((path: string) => {
      if (path === '/students/me/workout-plans') return pendingRetry.promise;
      if (path === `/workout-plans/${activeWorkout.id}`) return Promise.resolve(activeWorkout);
      return Promise.resolve({ items: [] });
    });
    const retry = screen.getByRole('button', { name: 'Tentar novamente' });

    await act(async () => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });

    const updatingAction = await screen.findByRole('button', { name: 'Atualizando…' });
    expect(updatingAction.props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
    expect(screen.queryByText('Carregando treino')).toBeNull();
    expect(apiState.request).toHaveBeenCalledTimes(1);

    await act(async () => pendingRetry.resolve({ items: [activeWorkoutSummary] }));

    await waitFor(() => expect(screen.queryByText('Não foi possível atualizar')).toBeNull());
    expect(screen.getByText('Supino')).toBeTruthy();
  });

  it('mantém Continuar treino quando o rascunho chega a 100%', async () => {
    const day = activeWorkout.days[0];
    storageState.getItem.mockImplementation(async (key: string) =>
      key === workoutSessionKey('auth-user-a', day.id)
        ? JSON.stringify({
            version: 1,
            workoutDayId: day.id,
            startedAtMs: 1_000,
            updatedAtMs: 121_000,
            currentExerciseIndex: 1,
            currentSetIndex: 0,
            phase: 'set',
            restEndsAtMs: null,
            sets: [
              {
                workoutExerciseId: day.exercises[0].id,
                setNumber: 1,
                repsDone: '10',
                loadKg: '20',
                completed: true,
              },
              {
                workoutExerciseId: day.exercises[0].id,
                setNumber: 2,
                repsDone: '10',
                loadKg: '20',
                completed: true,
              },
              {
                workoutExerciseId: day.exercises[1].id,
                setNumber: 1,
                repsDone: '12',
                loadKg: '',
                completed: true,
              },
            ],
          })
        : null,
    );
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino pronto para concluir')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuar treino' })).toBeTruthy();
    expect(linkState.hrefs).toContain(`/session/${day.id}`);
  });

  it('exibe o cabeçalho no erro de payload online inválido', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce({
        ...activeWorkout,
        days: [
          {
            ...activeWorkout.days[0],
            exercises: [
              {
                ...activeWorkout.days[0].exercises[0],
                workoutDayId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
    expect(storageState.setItem).not.toHaveBeenCalled();
    expect(screen.queryByText('Supino')).toBeNull();
  });

  it('shows retry instead of stale content when online validation fails', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce({
        ...activeWorkout,
        days: [
          {
            ...activeWorkout.days[0],
            exercises: [
              {
                ...activeWorkout.days[0].exercises[0],
                workoutDayId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ items: [] });
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByText('offline')).toBeNull();
    expect(screen.queryByText('Supino')).toBeNull();
    expect(storageState.setItem).not.toHaveBeenCalled();
  });

  it('shows retry instead of stale content for a structurally invalid summary payload', async () => {
    apiState.request.mockResolvedValueOnce({
      items: [{ id: activeWorkout.id, status: 'paused' }],
    });
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByText('offline')).toBeNull();
    expect(storageState.getItem).not.toHaveBeenCalled();
    expect(storageState.setItem).not.toHaveBeenCalled();
  });

  it('exibe o cabeçalho e retry para erro HTTP sem dados', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('unauthorized', 401));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByText('offline')).toBeNull();
    expect(storageState.getItem).not.toHaveBeenCalled();
  });

  it('continua o rascunho autenticado direto na sessão', async () => {
    const savedSession = {
      version: 1,
      workoutDayId: activeWorkout.days[0].id,
      startedAtMs: 1_000,
      updatedAtMs: 2_000,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      phase: 'set',
      restEndsAtMs: null,
      sets: [
        {
          workoutExerciseId: activeWorkout.days[0].exercises[0].id,
          setNumber: 1,
          repsDone: '10',
          loadKg: '20',
          completed: true,
        },
        {
          workoutExerciseId: activeWorkout.days[0].exercises[0].id,
          setNumber: 2,
          repsDone: '10',
          loadKg: '20',
          completed: true,
        },
        {
          workoutExerciseId: activeWorkout.days[0].exercises[1].id,
          setNumber: 1,
          repsDone: '',
          loadKg: '',
          completed: false,
        },
      ],
    };
    storageState.getItem.mockImplementation(async (key: string) =>
      key === workoutSessionKey('auth-user-a', activeWorkout.days[0].id)
        ? JSON.stringify(savedSession)
        : null,
    );
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino em andamento')).toBeTruthy();
    expect(screen.getByText('1 de 2 exercícios concluídos')).toBeTruthy();
    expect(screen.getByText('Próximo: Remada · Série 1 de 1')).toBeTruthy();
    expect(screen.getByTestId('workout-progress')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuar treino' })).toBeTruthy();
    expect(linkState.hrefs).toContain(`/session/${activeWorkout.days[0].id}`);
  });

  it('libera o mesmo workoutDayId para iniciar no novo dia quando o tombstone antigo não consegue remover o rascunho', async () => {
    const day = activeWorkout.days[0];
    const sessionKey = workoutSessionKey('auth-user-a', day.id);
    const journalKey = 'muvit_workout_log_journal';
    const previousDayMs = new Date(2026, 7, 27, 12).getTime();
    const nextDayMs = new Date(2026, 7, 28, 12).getTime();
    const staleDraft = {
      kind: 'active',
      version: 2,
      ownerAuthUserId: 'auth-user-a',
      day,
      session: {
        version: 2,
        workoutDayId: day.id,
        startedAtMs: previousDayMs,
        updatedAtMs: previousDayMs + 60_000,
        activeDurationMs: 60_000,
        activeSinceMs: null,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        phase: 'set',
        restEndsAtMs: null,
        sets: [
          {
            workoutExerciseId: day.exercises[0].id,
            setNumber: 1,
            repsDone: '',
            loadKg: '',
            completed: false,
          },
          {
            workoutExerciseId: day.exercises[0].id,
            setNumber: 2,
            repsDone: '',
            loadKg: '',
            completed: false,
          },
          {
            workoutExerciseId: day.exercises[1].id,
            setNumber: 1,
            repsDone: '',
            loadKg: '',
            completed: false,
          },
        ],
      },
    };
    const staleTerminal = JSON.stringify([
      {
        version: 1,
        operationId: 'terminal-old-day',
        ownerAuthUserId: 'auth-user-a',
        workoutDayId: day.id,
        date: '2026-08-27',
        finish: {
          durationMin: 1,
          completed: true,
          sets: [
            {
              workoutExerciseId: day.exercises[0].id,
              setNumber: 1,
              repsDone: 10,
              loadKg: 20,
            },
          ],
        },
        stage: { kind: 'terminal' },
      },
    ]);
    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) return JSON.stringify(staleDraft);
      if (key === journalKey) return staleTerminal;
      return null;
    });
    storageState.removeItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) throw new Error('falha ao remover rascunho');
    });
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(nextDayMs);

    try {
      renderWithQueryClient();

      expect(await screen.findByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
      expect(screen.getByText('Seu treino de hoje')).toBeTruthy();
      expect(screen.queryByText('Treino concluído')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Continuar treino' })).toBeNull();
      expect(linkState.hrefs).toContain(`/log/${day.id}`);
      expect(storageState.setItem).not.toHaveBeenCalledWith(journalKey, expect.any(String));
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserva a lista no summary e não oferece iniciar ou continuar', async () => {
    const day = activeWorkout.days[0];
    const sessionKey = workoutSessionKey('auth-user-a', day.id);
    storageState.getItem.mockImplementation(async (key: string) =>
      key === sessionKey
        ? JSON.stringify({
            kind: 'active',
            version: 2,
            ownerAuthUserId: 'auth-user-a',
            day,
            session: {
              version: 2,
              workoutDayId: day.id,
              startedAtMs: 1_000,
              updatedAtMs: 121_000,
              activeDurationMs: 120_000,
              activeSinceMs: null,
              currentExerciseIndex: 1,
              currentSetIndex: 0,
              phase: 'summary',
              restEndsAtMs: null,
              sets: [
                {
                  workoutExerciseId: day.exercises[0].id,
                  setNumber: 1,
                  repsDone: '10',
                  loadKg: '20',
                  completed: true,
                },
                {
                  workoutExerciseId: day.exercises[0].id,
                  setNumber: 2,
                  repsDone: '10',
                  loadKg: '20',
                  completed: true,
                },
                {
                  workoutExerciseId: day.exercises[1].id,
                  setNumber: 1,
                  repsDone: '12',
                  loadKg: '',
                  completed: true,
                },
              ],
            },
          })
        : null,
    );
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino concluído')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Iniciar treino' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuar treino' })).toBeNull();
    expect(linkState.hrefs).not.toContain(`/log/${day.id}`);
    expect(linkState.hrefs).not.toContain(`/session/${day.id}`);
  });

  it('prioriza a conclusão do journal sobre um rascunho ativo sem CTAs', async () => {
    const day = activeWorkout.days[0];
    const date = todayIsoDate();
    const startedAtMs = new Date(`${date}T12:00:00`).getTime();
    const sessionKey = workoutSessionKey('auth-user-a', day.id);
    const journal = [
      {
        version: 1,
        operationId: 'terminal-today',
        ownerAuthUserId: 'auth-user-a',
        workoutDayId: day.id,
        date,
        finish: {
          durationMin: 2,
          completed: true,
          sets: [
            {
              workoutExerciseId: day.exercises[0].id,
              setNumber: 1,
              repsDone: 10,
              loadKg: 20,
            },
          ],
        },
        stage: { kind: 'terminal' },
      },
    ];
    const activeDraft = {
      version: 1,
      workoutDayId: day.id,
      startedAtMs,
      updatedAtMs: startedAtMs + 60_000,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      phase: 'set',
      restEndsAtMs: null,
      sets: [
        {
          workoutExerciseId: day.exercises[0].id,
          setNumber: 1,
          repsDone: '',
          loadKg: '',
          completed: false,
        },
      ],
    };
    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === sessionKey) return JSON.stringify(activeDraft);
      if (key === 'muvit_workout_log_journal') return JSON.stringify(journal);
      return null;
    });
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino concluído')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Iniciar treino' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuar treino' })).toBeNull();
  });

  it('shows a retry action when loading today fails without cache', async () => {
    apiState.request
      .mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')))
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Iniciar treino')).toBeTruthy();
  });

  it('informa que o treino válido veio do cache offline', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Treino carregado offline')).toBeTruthy();
    expect(storageState.setItem).not.toHaveBeenCalled();
    expect(screen.getByText('Plano A · Treino A')).toBeTruthy();
  });

  it('informa o estado offline junto ao vazio sem plano', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify({ status: 'no-active-plan' }));

    renderWithQueryClient();

    expect(await screen.findByText('Sem plano ativo')).toBeTruthy();
    expect(screen.getByText('Treino carregado offline')).toBeTruthy();
  });

  it('informa o estado offline junto à recuperação', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(
      JSON.stringify({
        status: 'no-workout-today',
        plan: { ...cachedWorkout.plan, days: [] },
      }),
    );

    renderWithQueryClient();

    expect(await screen.findByText('Hoje é dia de recuperação')).toBeTruthy();
    expect(screen.getByText('Treino carregado offline')).toBeTruthy();
  });

  it('oferece retry quando o cache offline é inválido', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify({ cached: true }));

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('isola o cache offline quando a conta autenticada muda', async () => {
    apiState.request.mockRejectedValue(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockImplementation(async (key: string) =>
      key === 'today-workout:auth-user-a'
        ? JSON.stringify({
            status: 'no-active-plan',
          })
        : null,
    );

    const queryClient = createQueryClient();
    const firstRender = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Treino carregado offline')).toBeTruthy();
    expect(storageState.getItem).toHaveBeenCalledWith('today-workout:auth-user-a');

    authState.userId = 'auth-user-b';
    firstRender.rerender(
      <QueryClientProvider client={queryClient}>
        <TodayWorkoutScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
    expect(storageState.getItem).toHaveBeenCalledWith('today-workout:auth-user-b');
  });

  it('abre detalhes pelo ID da prescrição com origem Hoje', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce({
        ...activeWorkout,
        days: [
          {
            ...activeWorkout.days[0],
            exercises: [
              {
                ...activeWorkout.days[0].exercises[0],
                notes: 'Controlar cadencia',
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    await user.press(await screen.findByRole('button', { name: 'Ver detalhes de Supino, Peito' }));

    expect(routerState.pushes).toContainEqual({
      pathname: '/exercise/[dayId]/[exerciseId]',
      params: {
        dayId: activeWorkout.days[0].id,
        exerciseId: activeWorkout.days[0].exercises[0].id,
        source: 'today',
      },
    });
  });

  it('remove a lista anterior quando a conta autenticada muda', async () => {
    const user = userEvent.setup();
    const otherWorkout = {
      ...activeWorkout,
      id: '22222222-2222-4222-8222-222222222222',
      days: [
        {
          ...activeWorkout.days[0],
          id: '33333333-3333-4333-8333-333333333333',
          planId: '22222222-2222-4222-8222-222222222222',
          exercises: [
            {
              ...activeWorkout.days[0].exercises[0],
              id: '44444444-4444-4444-8444-444444444444',
              workoutDayId: '33333333-3333-4333-8333-333333333333',
              exerciseId: '55555555-5555-4555-8555-555555555555',
              exercise: {
                id: '55555555-5555-4555-8555-555555555555',
                name: 'Agachamento',
                muscleGroup: 'legs',
              },
            },
          ],
        },
      ],
    };
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        items: [
          {
            ...activeWorkoutSummary,
            id: otherWorkout.id,
          },
        ],
      })
      .mockResolvedValueOnce(otherWorkout)
      .mockResolvedValueOnce({ items: [] });

    const queryClient = createQueryClient();
    const firstRender = renderWithQueryClient(queryClient);
    expect(await screen.findByText('Supino')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Ver detalhes de Supino, Peito' }));
    expect(routerState.pushes).toHaveLength(1);

    authState.userId = 'auth-user-b';
    firstRender.rerender(
      <QueryClientProvider client={queryClient}>
        <TodayWorkoutScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Agachamento')).toBeTruthy();
    expect(screen.queryByText('Supino')).toBeNull();
  });
});
