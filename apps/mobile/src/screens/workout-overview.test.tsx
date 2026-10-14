import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkoutOverviewScreen } from './workout-overview';

const authState = vi.hoisted(() => ({ userId: 'auth-user-a' as string | null }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  back: vi.fn(),
  canGoBack: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
const navigationState = vi.hoisted(() => ({
  addListener: vi.fn((_event: string, _listener: () => void) => () => undefined),
}));
const routeState = vi.hoisted(() => ({ dayId: '22222222-2222-4222-8222-222222222222' }));

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

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => ({ dayId: routeState.dayId }),
  useNavigation: () => navigationState,
}));

const workoutPlan = {
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
          sets: 3,
          reps: '10',
          loadKg: 20,
          restSeconds: 60,
          notes: 'Controle a descida.',
          tempo: null,
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
          notes: null,
          tempo: null,
          exercise: {
            id: '88888888-8888-4888-8888-888888888888',
            name: 'Crucifixo inclinado',
            muscleGroup: 'shoulders',
          },
        },
      ],
    },
  ],
};
const workoutPlanSummary = {
  id: workoutPlan.id,
  studentId: workoutPlan.studentId,
  trainerId: workoutPlan.trainerId,
  name: workoutPlan.name,
  startDate: workoutPlan.startDate,
  endDate: workoutPlan.endDate,
  status: workoutPlan.status,
  createdAt: workoutPlan.createdAt,
};
const otherDayWorkoutPlan = {
  ...workoutPlan,
  id: '66666666-6666-4666-8666-666666666666',
  days: [
    {
      ...workoutPlan.days[0],
      id: '99999999-9999-4999-8999-999999999999',
      planId: '66666666-6666-4666-8666-666666666666',
      label: 'Treino B',
      exercises: [
        {
          ...workoutPlan.days[0].exercises[0],
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          workoutDayId: '99999999-9999-4999-8999-999999999999',
          exerciseId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          exercise: {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            name: 'Agachamento',
            muscleGroup: 'legs',
          },
        },
      ],
    },
  ],
};
const otherUserWorkoutPlan = {
  ...workoutPlan,
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  days: [
    {
      ...workoutPlan.days[0],
      planId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      label: 'Treino B',
      exercises: [
        {
          ...workoutPlan.days[0].exercises[0],
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          exerciseId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          exercise: {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            name: 'Remada baixa',
            muscleGroup: 'back',
          },
        },
      ],
    },
  ],
};

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithQueryClient(queryClient = createQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutOverviewScreen />
    </QueryClientProvider>,
  );
}

function enqueueWorkoutPlan(plan: typeof workoutPlan = workoutPlan) {
  apiState.request
    .mockResolvedValueOnce({ items: [{ ...workoutPlanSummary, id: plan.id }] })
    .mockResolvedValueOnce(plan);
}

function createDeferred<Value>() {
  let resolveValue: ((value: Value) => void) | undefined;
  let rejectValue: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolveValue = resolvePromise;
    rejectValue = rejectPromise;
  });

  return {
    promise,
    resolve: (value: Value) => resolveValue?.(value),
    reject: (reason: unknown) => rejectValue?.(reason),
  };
}

describe('WorkoutOverviewScreen', () => {
  beforeEach(() => {
    authState.userId = 'auth-user-a';
    routeState.dayId = '22222222-2222-4222-8222-222222222222';
    apiState.request.mockReset();
    routerState.back.mockReset();
    routerState.canGoBack.mockReset().mockReturnValue(true);
    routerState.push.mockReset();
    routerState.replace.mockReset();
    navigationState.addListener.mockClear();
  });

  it('does not request or show workout content without an authenticated identity', () => {
    authState.userId = null;

    renderWithQueryClient();

    expect(apiState.request).not.toHaveBeenCalled();
    expect(screen.queryByText('Supino reto')).toBeNull();
    expect(screen.queryByText('Crucifixo inclinado')).toBeNull();
  });

  it('keeps the back header in loading and error and uses the history fallback', async () => {
    const user = userEvent.setup();
    const pendingSummary = createDeferred<unknown>();
    apiState.request.mockReturnValueOnce(pendingSummary.promise);

    renderWithQueryClient();

    expect(screen.getByText('Carregando treino')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Voltar para Hoje' }));
    expect(routerState.back).toHaveBeenCalledOnce();
    expect(routerState.replace).not.toHaveBeenCalled();

    await act(async () => {
      pendingSummary.reject(new Error('Sem conexão.'));
      await pendingSummary.promise.catch(() => undefined);
    });

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para Hoje' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();

    routerState.canGoBack.mockReturnValue(false);
    await user.press(screen.getByRole('button', { name: 'Voltar para Hoje' }));
    expect(routerState.replace).toHaveBeenCalledWith('/');
  });

  it('shows the day label and summary without inventing a plan name', async () => {
    enqueueWorkoutPlan();

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Visão geral do treino')).toBeTruthy();
    expect(screen.getByText('Confira os exercícios antes de começar.')).toBeTruthy();
    expect(screen.getByText('Treino A')).toBeTruthy();
    expect(screen.getByText('2 exercícios · ~11 min estimados')).toBeTruthy();
    expect(screen.queryByText('Plano A')).toBeNull();
  });

  it('shows prescription and rest for each detailed exercise row', async () => {
    enqueueWorkoutPlan();

    renderWithQueryClient();

    expect(
      await screen.findByRole('button', { name: 'Ver detalhes de Supino reto, Peito' }),
    ).toBeTruthy();
    expect(screen.getByText('3 séries · 10 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 60 s')).toBeTruthy();
    expect(screen.getByText('3 séries · 12 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 45 s')).toBeTruthy();
  });

  it('opens the exercise route with the prescription ID and overview source', async () => {
    const user = userEvent.setup();
    enqueueWorkoutPlan();

    renderWithQueryClient();

    await user.press(
      await screen.findByRole('button', { name: 'Ver detalhes de Supino reto, Peito' }),
    );

    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/exercise/[dayId]/[exerciseId]',
      params: {
        dayId: workoutPlan.days[0].id,
        exerciseId: workoutPlan.days[0].exercises[0].id,
        source: 'overview',
      },
    });
    expect(routerState.push).not.toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          exerciseId: workoutPlan.days[0].exercises[0].exerciseId,
        }),
      }),
    );
  });

  it('preserves content through a failed refetch and a pending retry, then clears the warning on success', async () => {
    const user = userEvent.setup();
    enqueueWorkoutPlan();
    const queryClient = createQueryClient();

    renderWithQueryClient(queryClient);

    expect(await screen.findByText('Supino reto')).toBeTruthy();
    apiState.request.mockRejectedValueOnce(new Error('Sem conexão.'));

    await user.press(screen.getByRole('button', { name: 'Iniciar treino' }));
    expect(routerState.push).toHaveBeenCalledWith(`/session/${workoutPlan.days[0].id}`);

    await act(async () => {
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: ['workout-overview', 'auth-user-a', workoutPlan.days[0].id],
      });
    });
    expect(await screen.findByText('Não foi possível atualizar')).toBeTruthy();
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Crucifixo inclinado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();

    const pendingSummary = createDeferred<unknown>();
    apiState.request.mockReturnValueOnce(pendingSummary.promise).mockResolvedValueOnce(workoutPlan);
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    const retryButton = await screen.findByRole('button', { name: 'Atualizando…' });
    expect(retryButton.props.disabled).toBe(true);
    expect(retryButton.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Crucifixo inclinado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();

    await user.press(retryButton);
    expect(apiState.request).toHaveBeenCalledTimes(4);

    await act(async () => {
      pendingSummary.resolve({ items: [workoutPlanSummary] });
      await pendingSummary.promise;
    });

    await waitFor(() => expect(screen.queryByText('Não foi possível atualizar')).toBeNull());
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(5);
  });

  it('permite tentar novamente no novo treino enquanto a tentativa do anterior continua pendente', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const pendingSummaryA = createDeferred<unknown>();
    const pendingSummaryB = createDeferred<unknown>();
    let summaryRequestCount = 0;
    apiState.request.mockImplementation((path: string) => {
      if (path === '/students/me/workout-plans') {
        summaryRequestCount += 1;
        if (summaryRequestCount === 1) return Promise.reject(new Error('Falha no treino A.'));
        if (summaryRequestCount === 2) return pendingSummaryA.promise;
        if (summaryRequestCount === 3) return Promise.reject(new Error('Falha no treino B.'));
        if (summaryRequestCount === 4) return pendingSummaryB.promise;
        return Promise.resolve({ items: [workoutPlanSummary] });
      }
      if (path === `/workout-plans/${workoutPlan.id}`) return Promise.resolve(workoutPlan);
      if (path === `/workout-plans/${otherDayWorkoutPlan.id}`) {
        return Promise.resolve(otherDayWorkoutPlan);
      }
      return Promise.reject(new Error('Requisição inesperada.'));
    });

    const rendered = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Carregando treino')).toBeTruthy();

    routeState.dayId = otherDayWorkoutPlan.days[0].id;
    rendered.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkoutOverviewScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    const callsBeforeRetryB = apiState.request.mock.calls.length;
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    const retryBStarted = apiState.request.mock.calls.length > callsBeforeRetryB;

    await act(async () => {
      pendingSummaryA.resolve({ items: [workoutPlanSummary] });
      await pendingSummaryA.promise;
      await waitFor(() =>
        expect(
          queryClient.getQueryState(['workout-overview', 'auth-user-a', workoutPlan.days[0].id])
            ?.status,
        ).toBe('success'),
      );
    });

    expect(
      queryClient.getQueryState(['workout-overview', 'auth-user-a', otherDayWorkoutPlan.days[0].id])
        ?.fetchStatus,
    ).toBe(retryBStarted ? 'fetching' : 'idle');

    await act(async () => {
      pendingSummaryB.resolve({
        items: [{ ...workoutPlanSummary, id: otherDayWorkoutPlan.id }],
      });
      await pendingSummaryB.promise;
      if (retryBStarted) {
        await waitFor(() =>
          expect(
            queryClient.getQueryState([
              'workout-overview',
              'auth-user-a',
              otherDayWorkoutPlan.days[0].id,
            ])?.status,
          ).toBe('success'),
        );
      }
    });

    if (retryBStarted) expect(await screen.findByText('Agachamento')).toBeTruthy();
    expect(retryBStarted).toBe(true);
  });

  it('removes the previous day while the new day is loading', async () => {
    enqueueWorkoutPlan();
    const queryClient = createQueryClient();
    const rendered = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Supino reto')).toBeTruthy();

    const pendingSummary = createDeferred<unknown>();
    apiState.request
      .mockReturnValueOnce(pendingSummary.promise)
      .mockResolvedValueOnce(otherDayWorkoutPlan);
    routeState.dayId = otherDayWorkoutPlan.days[0].id;
    rendered.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkoutOverviewScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Carregando treino')).toBeTruthy();
    expect(screen.queryByText('Supino reto')).toBeNull();

    await act(async () => {
      pendingSummary.resolve({ items: [{ ...workoutPlanSummary, id: otherDayWorkoutPlan.id }] });
      await pendingSummary.promise;
    });

    expect(await screen.findByText('Agachamento')).toBeTruthy();
  });

  it('removes the previous account content while the new identity is loading', async () => {
    enqueueWorkoutPlan();
    const queryClient = createQueryClient();
    const rendered = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Supino reto')).toBeTruthy();

    const pendingSummary = createDeferred<unknown>();
    apiState.request
      .mockReturnValueOnce(pendingSummary.promise)
      .mockResolvedValueOnce(otherUserWorkoutPlan);
    authState.userId = 'auth-user-b';
    rendered.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkoutOverviewScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Carregando treino')).toBeTruthy();
    expect(screen.queryByText('Supino reto')).toBeNull();

    await act(async () => {
      pendingSummary.resolve({ items: [{ ...workoutPlanSummary, id: otherUserWorkoutPlan.id }] });
      await pendingSummary.promise;
    });

    expect(await screen.findByText('Remada baixa')).toBeTruthy();
  });
});
