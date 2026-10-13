import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkoutExerciseScreen } from './workout-exercise';

const authState = vi.hoisted(() => ({ userId: 'auth-user-a' as string | null }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  back: vi.fn(),
  canGoBack: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
const navigationListeners = vi.hoisted(() => ({
  entries: [] as Array<{ event: string; listener: () => void }>,
}));
const navigationState = vi.hoisted(() => ({
  addListener: vi.fn((event: string, listener: () => void) => {
    navigationListeners.entries.push({ event, listener });
    return () => undefined;
  }),
}));
const routeState = vi.hoisted(() => ({
  dayId: '22222222-2222-4222-8222-222222222222' as string | string[],
  exerciseId: '11111111-1111-4111-8111-111111111111' as string | string[],
  source: 'today' as string | string[],
}));
const nativeAccessibility = vi.hoisted(() => ({
  findNodeHandle: vi.fn((node: object | null) => (node ? 1 : null)),
  setAccessibilityFocus: vi.fn(),
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: authState.userId } } }),
  },
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

vi.mock('react-native', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const focusableText = React.forwardRef<object, { children?: ReactNode; [key: string]: unknown }>(
    function FocusableText(props, ref) {
      React.useImperativeHandle(ref, () => ({}), []);
      const NativeText = original.Text as React.ComponentType<{
        children?: ReactNode;
        [key: string]: unknown;
      }>;
      return <NativeText {...props} />;
    },
  );
  return {
    ...original,
    AccessibilityInfo: { setAccessibilityFocus: nativeAccessibility.setAccessibilityFocus },
    findNodeHandle: nativeAccessibility.findNodeHandle,
    Text: focusableText,
  };
});

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => routeState,
  useNavigation: () => navigationState,
}));

const day = {
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
      sets: 3,
      reps: '10',
      loadKg: null,
      restSeconds: 60,
      tempo: null,
      notes: 'Controle a descida.',
      exercise: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Supino reto',
        muscleGroup: 'chest',
      },
    },
    {
      id: '77777777-7777-4777-8777-777777777777',
      workoutDayId: '22222222-2222-4222-8222-222222222222',
      exerciseId: '88888888-8888-4888-8888-888888888888',
      exerciseOrder: 1,
      sets: 3,
      reps: '12',
      loadKg: null,
      restSeconds: 45,
      tempo: null,
      notes: null,
      exercise: {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Crucifixo inclinado',
        muscleGroup: 'shoulders',
      },
    },
  ],
};
const planSummary = {
  id: '44444444-4444-4444-8444-444444444444',
  studentId: '55555555-5555-4555-8555-555555555555',
  trainerId: null,
  name: 'Plano A',
  startDate: null,
  endDate: null,
  status: 'active',
  createdAt: '2026-08-15T12:00:00.000Z',
};
const plan = {
  ...planSummary,
  notes: null,
  days: [day],
};

function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderScreen(queryClient = createQueryClient()) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <WorkoutExerciseScreen />
      </QueryClientProvider>,
    ),
  };
}

function cacheToday(queryClient: QueryClient, userId = 'auth-user-a', currentDay = day) {
  queryClient.setQueryData(['today-workout', userId], {
    data: { status: 'available', day: currentDay, plan },
    stale: false,
    completedLocal: false,
    draft: null,
  });
}

function cacheOverview(queryClient: QueryClient, userId = 'auth-user-a', currentDay = day) {
  queryClient.setQueryData(['workout-overview', userId, currentDay.id], currentDay);
}

function enqueueWorkoutPlan(currentPlan = plan) {
  apiState.request
    .mockResolvedValueOnce({ items: [{ ...planSummary, id: currentPlan.id }] })
    .mockResolvedValueOnce(currentPlan);
}

function createDeferred<Value>() {
  let resolveValue: ((value: Value) => void) | undefined;
  const promise = new Promise<Value>((resolvePromise) => {
    resolveValue = resolvePromise;
  });
  return { promise, resolve: (value: Value) => resolveValue?.(value) };
}

describe('WorkoutExerciseScreen', () => {
  beforeEach(() => {
    authState.userId = 'auth-user-a';
    routeState.dayId = day.id;
    routeState.exerciseId = day.exercises[0].id;
    routeState.source = 'today';
    apiState.request.mockReset();
    routerState.back.mockReset();
    routerState.canGoBack.mockReset().mockReturnValue(true);
    routerState.push.mockReset();
    routerState.replace.mockReset();
    navigationListeners.entries = [];
    navigationState.addListener.mockClear();
    nativeAccessibility.findNodeHandle.mockClear();
    nativeAccessibility.setAccessibilityFocus.mockClear();
  });

  it('selects the source-specific Today cache and shows the full prescription', async () => {
    const queryClient = createQueryClient();
    cacheToday(queryClient);
    cacheOverview(queryClient, 'auth-user-a', { ...day, label: 'Outra origem' });

    renderScreen(queryClient);

    expect(await screen.findByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('3 séries · 10 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 60 s')).toBeTruthy();
    expect(screen.getByText('Controle a descida.')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('selects the overview cache and omits an empty observation', async () => {
    routeState.source = 'overview';
    routeState.exerciseId = day.exercises[1].id;
    const overviewDay = { ...day, exercises: [day.exercises[1]] };
    const queryClient = createQueryClient();
    cacheToday(queryClient);
    cacheOverview(queryClient, 'auth-user-a', overviewDay);

    renderScreen(queryClient);

    expect(await screen.findByText('Crucifixo inclinado')).toBeTruthy();
    expect(screen.getByText('Ombros')).toBeTruthy();
    expect(screen.queryByText('Observação')).toBeNull();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it.each(['today', 'overview'] as const)(
    'refreshes the prescription when the %s source cache changes',
    async (source) => {
      routeState.source = source;
      const queryClient = createQueryClient();
      if (source === 'today') cacheToday(queryClient);
      else cacheOverview(queryClient);

      renderScreen(queryClient);

      expect(await screen.findByText('3 séries · 10 repetições')).toBeTruthy();
      const updatedDay = {
        ...day,
        exercises: day.exercises.map((exercise, index) =>
          index === 0 ? { ...exercise, sets: 4, notes: 'Nova observação.' } : exercise,
        ),
      };
      const updatedAt = Date.now() + 1;
      if (source === 'today') {
        act(() => {
          queryClient.setQueryData(
            ['today-workout', 'auth-user-a'],
            {
              data: { status: 'available', day: updatedDay, plan },
              stale: false,
              completedLocal: false,
              draft: null,
            },
            { updatedAt },
          );
        });
      } else {
        act(() => {
          queryClient.setQueryData(['workout-overview', 'auth-user-a', day.id], updatedDay, {
            updatedAt,
          });
        });
      }

      expect(await screen.findByText('4 séries · 10 repetições')).toBeTruthy();
      expect(screen.getByText('Nova observação.')).toBeTruthy();
      expect(screen.queryByText('Controle a descida.')).toBeNull();
      expect(apiState.request).not.toHaveBeenCalled();
    },
  );

  it('does not keep rendering an exercise removed from the source cache', async () => {
    routeState.source = 'overview';
    const queryClient = createQueryClient();
    cacheOverview(queryClient);
    apiState.request.mockRejectedValue(new Error('offline'));

    renderScreen(queryClient);

    expect(await screen.findByText('Supino reto')).toBeTruthy();
    act(() => {
      queryClient.setQueryData(
        ['workout-overview', 'auth-user-a', day.id],
        { ...day, exercises: [day.exercises[1]] },
        { updatedAt: Date.now() + 1 },
      );
    });

    expect(await screen.findByText('Não foi possível carregar o exercício')).toBeTruthy();
    expect(screen.queryByText('Supino reto')).toBeNull();
  });

  it('loads direct entry from the current authenticated context when no cache exists', async () => {
    routeState.source = 'overview';
    enqueueWorkoutPlan();

    renderScreen();

    expect(await screen.findByText('Supino reto')).toBeTruthy();
    expect(apiState.request.mock.calls.map(([path]) => path)).toEqual([
      '/students/me/workout-plans',
      '/workout-plans/44444444-4444-4444-8444-444444444444',
    ]);
  });

  it('shows a recoverable error without querying when required route context is missing', () => {
    routeState.exerciseId = '';

    renderScreen();

    expect(screen.getByText('Não foi possível carregar o exercício')).toBeTruthy();
    expect(screen.queryByText('Carregando exercício')).toBeNull();
    expect(screen.getByText('Volte ao treino e abra um exercício da lista.')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('shows a recoverable error for an exercise ID absent from the loaded prescription', async () => {
    routeState.exerciseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    enqueueWorkoutPlan();

    renderScreen();

    expect(await screen.findByText('Exercício não encontrado')).toBeTruthy();
    expect(screen.queryByText('Supino reto')).toBeNull();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('does not display the previous account while a new identity loads the same route', async () => {
    routeState.source = 'overview';
    const queryClient = createQueryClient();
    cacheOverview(queryClient, 'auth-user-a');
    const pendingSummary = createDeferred<unknown>();
    apiState.request.mockImplementation((path: string) => {
      if (path === '/students/me/workout-plans') return pendingSummary.promise;
      return Promise.resolve(plan);
    });

    const view = renderScreen(queryClient);
    expect(await screen.findByText('Supino reto')).toBeTruthy();

    authState.userId = 'auth-user-b';
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkoutExerciseScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Carregando exercício')).toBeTruthy();
    expect(screen.queryByText('Supino reto')).toBeNull();

    await act(async () => {
      pendingSummary.resolve({ items: [planSummary] });
      await pendingSummary.promise;
    });
    expect(await screen.findByText('Supino reto')).toBeTruthy();
  });

  it('uses the contextual back route and Today fallback for direct entry', async () => {
    const user = userEvent.setup();
    routeState.source = 'overview';
    const queryClient = createQueryClient();
    cacheOverview(queryClient);
    cacheToday(queryClient);
    const view = renderScreen(queryClient);
    expect(await screen.findByText('Supino reto')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Voltar ao treino' }));
    expect(routerState.back).toHaveBeenCalledOnce();

    routerState.canGoBack.mockReturnValue(false);
    await user.press(screen.getByRole('button', { name: 'Voltar ao treino' }));
    expect(routerState.replace).toHaveBeenCalledWith(`/log/${day.id}`);

    routeState.source = 'today';
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkoutExerciseScreen />
      </QueryClientProvider>,
    );
    await user.press(screen.getByRole('button', { name: 'Voltar ao treino' }));
    expect(routerState.replace).toHaveBeenLastCalledWith('/');
  });

  it('focuses the exercise title when the screen opens', async () => {
    const queryClient = createQueryClient();
    cacheToday(queryClient);

    renderScreen(queryClient);

    expect(await screen.findByText('Supino reto')).toBeTruthy();
    await waitFor(() => expect(nativeAccessibility.setAccessibilityFocus).toHaveBeenCalledWith(1));
    expect(screen.getByText('3 séries · 10 repetições')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });
});
