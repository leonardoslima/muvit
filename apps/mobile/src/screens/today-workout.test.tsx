import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { type ReactNode, cloneElement, createElement, isValidElement } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiTransportError } from '../lib/api';
import { colors, controlSizes, fontFamilies, radii, spacing } from '../lib/styles';
import { workoutSessionKey } from '../lib/workout-session-storage';
import { TodayWorkoutScreen } from './today-workout';

const authState = vi.hoisted(() => ({ userId: 'auth-user-a' as string | null }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const linkState = vi.hoisted(() => ({ hrefs: [] as string[] }));
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
  Link: ({ asChild, children, href }: { asChild?: boolean; children: ReactNode; href: string }) => {
    linkState.hrefs.push(href);
    if (asChild && isValidElement<{ style?: unknown }>(children)) {
      return cloneElement(children, { style: undefined });
    }
    return children;
  },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { color: string; name: string; size: number; testID?: string }) =>
    createElement('Ionicons', props),
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

function legacySessionFor(workoutDayId: string): string {
  return JSON.stringify({
    version: 1,
    workoutDayId,
    startedAtMs: 1_000,
    updatedAtMs: 2_000,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    phase: 'set',
    restEndsAtMs: null,
    sets: [],
  });
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
    storageState.getItem.mockResolvedValue(null);
    storageState.removeItem.mockResolvedValue(undefined);
    storageState.setItem.mockResolvedValue(undefined);
  });

  it('renders the no-active-plan state', async () => {
    apiState.request.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Sem plano ativo')).toBeTruthy();
    expect(screen.getByText('Seu professor ainda não publicou um plano de treino.')).toBeTruthy();
  });

  it('renders the loading state with the Hoje skeleton structure', () => {
    apiState.request.mockImplementation(() => new Promise(() => undefined));

    renderWithQueryClient();

    expect(screen.getByLabelText('Carregando treino')).toBeTruthy();
    expect(screen.getByTestId('today-loading-exercise-1')).toBeTruthy();
    expect(screen.getByTestId('today-loading-exercise-2')).toBeTruthy();
    expect(screen.getByTestId('today-loading-exercise-3')).toBeTruthy();
  });

  it('renders the available workout as the primary green card', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Disponível offline')).toBeTruthy();
    expect(screen.getByText(/^[^,]+, \d{1,2} de [a-zç]+$/i)).toBeTruthy();

    const workoutCard = screen.getByTestId('today-workout-card');
    expect(StyleSheet.flatten(workoutCard.props.style)).toMatchObject({
      backgroundColor: colors.primary,
      borderRadius: radii.lg,
      borderWidth: 0,
    });
    const workoutAction = within(workoutCard).getByRole('button', { name: 'Iniciar treino' });
    expect(workoutAction.props.style).toBeTypeOf('function');
    const workoutActionStyle = StyleSheet.flatten(workoutAction.props.style({ pressed: false }));
    expect(workoutActionStyle).toMatchObject({
      backgroundColor: colors.surface,
      borderRadius: radii.control,
      borderWidth: 0,
      flexDirection: 'row',
      gap: spacing.sm,
      height: controlSizes.button,
      minHeight: controlSizes.button,
    });
    expect(workoutActionStyle.borderColor).toBeUndefined();
    expect(
      StyleSheet.flatten(within(workoutCard).getByText('Iniciar treino').props.style),
    ).toMatchObject({
      color: colors.ink,
      fontFamily: fontFamilies.bodyStrong,
      fontSize: 14,
    });
  });

  it('renders the empty state with a surfaced explanation', async () => {
    apiState.request.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByTestId('today-state-panel')).toBeTruthy();
    expect(screen.getByTestId('today-state-icon')).toBeTruthy();
    expect(screen.getByText('Quando houver um plano ativo, ele aparecerá aqui.')).toBeTruthy();
  });

  it('mantém o estado sem plano dentro do shell da tela Hoje e fora da tab bar', async () => {
    apiState.request.mockResolvedValueOnce({ items: [] });

    render(
      <BottomTabBarHeightContext.Provider value={controlSizes.tabBar}>
        <QueryClientProvider client={createQueryClient()}>
          <TodayWorkoutScreen />
        </QueryClientProvider>
      </BottomTabBarHeightContext.Provider>,
    );

    expect(await screen.findByText('Sem plano ativo')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Seu treino de hoje' })).toBeTruthy();

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(StyleSheet.flatten(scrollView.props.contentContainerStyle)).toMatchObject({
      flexGrow: 1,
      gap: spacing.lg,
      paddingBottom: controlSizes.tabBar + spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
    });
  });

  it('aplica 20 px de respiro lateral ao treino disponível', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    render(
      <BottomTabBarHeightContext.Provider value={controlSizes.tabBar}>
        <QueryClientProvider client={createQueryClient()}>
          <TodayWorkoutScreen />
        </QueryClientProvider>
      </BottomTabBarHeightContext.Provider>,
    );

    expect(await screen.findByText('Treino A')).toBeTruthy();

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(StyleSheet.flatten(scrollView.props.contentContainerStyle)).toMatchObject({
      paddingBottom: controlSizes.tabBar + spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
    });
  });

  it('renders the recovery state when there is no workout today', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce({ ...activeWorkout, days: [] })
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Hoje é dia de recuperação')).toBeTruthy();
    expect(
      screen.getByText('Aproveite para descansar e se preparar para o próximo treino.'),
    ).toBeTruthy();
  });

  it('renders the loaded workout without the exercise list in the available state', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    expect(screen.queryByText('Supino')).toBeNull();
    expect(screen.getByText('Iniciar treino')).toBeTruthy();
    expect(screen.getByText('Tudo pronto para você começar com calma.')).toBeTruthy();
    expect(linkState.hrefs).toContain(`/log/${activeWorkout.days[0].id}`);
    expect(storageState.getItem).toHaveBeenCalledWith(
      workoutSessionKey('auth-user-a', activeWorkout.days[0].id),
    );
    await waitFor(() => expect(screen.queryByText('Sem treino ativo')).toBeNull());
  });

  it('rejects an invalid online workout before caching or rendering it', async () => {
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

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
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

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByText('Disponível offline')).toBeNull();
    expect(screen.queryByText('Supino')).toBeNull();
    expect(storageState.setItem).not.toHaveBeenCalled();
  });

  it('shows retry instead of stale content for a structurally invalid summary payload', async () => {
    apiState.request.mockResolvedValueOnce({
      items: [{ id: activeWorkout.id, status: 'paused' }],
    });
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByText('Disponível offline')).toBeNull();
    expect(storageState.getItem).not.toHaveBeenCalled();
    expect(storageState.setItem).not.toHaveBeenCalled();
  });

  it('shows retry instead of stale content for an HTTP API error', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('unauthorized', 401));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByText('Disponível offline')).toBeNull();
    expect(storageState.getItem).not.toHaveBeenCalled();
  });

  it('offers continuing the workout when a draft exists for the authenticated user and day', async () => {
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

      expect(await screen.findByText('Treino A')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
      expect(screen.queryByText('Treino concluído')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Continuar treino' })).toBeNull();
      expect(linkState.hrefs).toContain(`/log/${day.id}`);
      expect(storageState.setItem).not.toHaveBeenCalledWith(journalKey, expect.any(String));
    } finally {
      vi.useRealTimers();
    }
  });

  it('trata um envelope summary como conclusão local sem iniciar ou continuar', async () => {
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
    expect(screen.queryByRole('button', { name: 'Iniciar treino' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuar treino' })).toBeNull();
    expect(linkState.hrefs).not.toContain(`/log/${day.id}`);
    expect(linkState.hrefs).not.toContain(`/session/${day.id}`);
  });

  it('shows a retry action when loading today fails without cache', async () => {
    apiState.request
      .mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')))
      .mockResolvedValueOnce({ items: [activeWorkoutSummary] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Iniciar treino')).toBeTruthy();
  });

  it('renders the retry arrow inside the AppButton as its trailing icon', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));

    renderWithQueryClient();

    const retryButton = await screen.findByRole('button', { name: 'Tentar novamente' });
    const retryChildren = Array.isArray(retryButton.props.children)
      ? retryButton.props.children
      : [retryButton.props.children];

    expect(retryChildren).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          props: expect.objectContaining({
            color: colors.ink,
            name: 'arrow-forward-outline',
            size: 18,
          }),
        }),
      ]),
    );
  });

  it('renders stale offline badge from cached workout', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify(cachedWorkout));

    renderWithQueryClient();

    expect(await screen.findByText('Disponível offline')).toBeTruthy();
    expect(storageState.setItem).not.toHaveBeenCalled();
    expect(screen.getByText('Treino A')).toBeTruthy();
  });

  it('shows the offline badge for stale empty states', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify({ status: 'no-active-plan' }));

    renderWithQueryClient();

    expect(await screen.findByText('Sem plano ativo')).toBeTruthy();
    expect(screen.getByText('Disponível offline')).toBeTruthy();
  });

  it('shows the offline badge for a stale recovery state', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(
      JSON.stringify({
        status: 'no-workout-today',
        plan: { ...cachedWorkout.plan, days: [] },
      }),
    );

    renderWithQueryClient();

    expect(await screen.findByText('Hoje é dia de recuperação')).toBeTruthy();
    expect(screen.getByText('Disponível offline')).toBeTruthy();
  });

  it('shows retry when stale cache is invalid', async () => {
    apiState.request.mockRejectedValueOnce(new ApiTransportError(new TypeError('offline')));
    storageState.getItem.mockResolvedValueOnce(JSON.stringify({ cached: true }));

    renderWithQueryClient();

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('isolates the offline cache when the authenticated account changes', async () => {
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

    expect(await screen.findByText('Disponível offline')).toBeTruthy();
    expect(storageState.getItem).toHaveBeenCalledWith('today-workout:auth-user-a');

    authState.userId = 'auth-user-b';
    firstRender.rerender(
      <QueryClientProvider client={queryClient}>
        <TodayWorkoutScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    expect(storageState.getItem).toHaveBeenCalledWith('today-workout:auth-user-b');
  });

  it('opens and closes the exercise details modal', async () => {
    const user = userEvent.setup();
    storageState.getItem.mockImplementation(async (key: string) =>
      key === workoutSessionKey('auth-user-a', activeWorkout.days[0].id)
        ? legacySessionFor(activeWorkout.days[0].id)
        : null,
    );
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

    await user.press(await screen.findByText('Supino'));

    expect(screen.getByText('Grupo muscular: chest')).toBeTruthy();
    expect(screen.getByText('Controlar cadencia')).toBeTruthy();

    await user.press(screen.getByText('Fechar'));

    await waitFor(() => expect(screen.queryByText('Grupo muscular: chest')).toBeNull());
  });

  it('closes the exercise modal when the authenticated account changes', async () => {
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
    storageState.getItem.mockImplementation(async (key: string) => {
      if (key === workoutSessionKey('auth-user-a', activeWorkout.days[0].id)) {
        return legacySessionFor(activeWorkout.days[0].id);
      }
      if (key === workoutSessionKey('auth-user-b', otherWorkout.days[0].id)) {
        return legacySessionFor(otherWorkout.days[0].id);
      }
      return null;
    });
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
    await user.press(await screen.findByText('Supino'));
    expect(screen.getByText('Grupo muscular: chest')).toBeTruthy();

    authState.userId = 'auth-user-b';
    firstRender.rerender(
      <QueryClientProvider client={queryClient}>
        <TodayWorkoutScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Agachamento')).toBeTruthy();
    expect(screen.queryByText('Grupo muscular: chest')).toBeNull();
  });
});
