import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkoutOverviewScreen } from './workout-overview';

const authState = vi.hoisted(() => ({ userId: 'auth-user-a' as string | null }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ push: vi.fn() }));
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
            name: 'Supino',
            muscleGroup: 'Peito',
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

describe('WorkoutOverviewScreen', () => {
  beforeEach(() => {
    authState.userId = 'auth-user-a';
    routeState.dayId = '22222222-2222-4222-8222-222222222222';
    apiState.request.mockReset();
    routerState.push.mockReset();
  });

  it('does not query the API while the authenticated identity is missing', () => {
    authState.userId = null;

    renderWithQueryClient();

    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('renders the workout content and starts the guided session', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: workoutPlan.id, status: 'active' }] })
      .mockResolvedValueOnce(workoutPlan);

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('1 exercícios · ~6 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Iniciar treino' }));

    expect(routerState.push).toHaveBeenCalledWith(`/session/${workoutPlan.days[0].id}`);
  });

  it('keeps exercise details available from the overview', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: workoutPlan.id, status: 'active' }] })
      .mockResolvedValueOnce(workoutPlan);

    renderWithQueryClient();

    await user.press(await screen.findByText('Supino'));

    expect(screen.getByText('Grupo muscular: Peito')).toBeTruthy();
    expect(screen.getByText('3 séries de 10 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 60 s')).toBeTruthy();
    expect(screen.getByText('Controle a descida.')).toBeTruthy();
  });

  it('refetches the overview when the authenticated account changes on the same query client', async () => {
    const user = userEvent.setup();
    const otherWorkoutPlan = {
      ...workoutPlan,
      id: '66666666-6666-4666-8666-666666666666',
      days: [
        {
          ...workoutPlan.days[0],
          id: workoutPlan.days[0].id,
          planId: '66666666-6666-4666-8666-666666666666',
          label: 'Treino B',
          exercises: [
            {
              ...workoutPlan.days[0].exercises[0],
              id: '88888888-8888-4888-8888-888888888888',
              workoutDayId: workoutPlan.days[0].id,
              exerciseId: '99999999-9999-4999-8999-999999999999',
              exercise: {
                id: '99999999-9999-4999-8999-999999999999',
                name: 'Agachamento',
                muscleGroup: 'Pernas',
              },
            },
          ],
        },
      ],
    };
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: workoutPlan.id, status: 'active' }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockResolvedValueOnce({ items: [{ id: otherWorkoutPlan.id, status: 'active' }] })
      .mockResolvedValueOnce(otherWorkoutPlan);

    const queryClient = createQueryClient();
    const firstRender = renderWithQueryClient(queryClient);

    expect(await screen.findByText('Supino')).toBeTruthy();

    authState.userId = 'auth-user-b';
    firstRender.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkoutOverviewScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Agachamento')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Iniciar treino' }));
    expect(routerState.push).toHaveBeenCalledWith(`/session/${workoutPlan.days[0].id}`);
  });

  it('closes the exercise modal when identity and day change on the same query client', async () => {
    const user = userEvent.setup();
    const otherWorkoutPlan = {
      ...workoutPlan,
      days: [
        {
          ...workoutPlan.days[0],
          id: '66666666-6666-4666-8666-666666666666',
          label: 'Treino B',
          exercises: [
            {
              ...workoutPlan.days[0].exercises[0],
              id: '77777777-7777-4777-8777-777777777777',
              workoutDayId: '66666666-6666-4666-8666-666666666666',
              exerciseId: '88888888-8888-4888-8888-888888888888',
              exercise: {
                id: '88888888-8888-4888-8888-888888888888',
                name: 'Agachamento',
                muscleGroup: 'Pernas',
              },
            },
          ],
        },
      ],
    };
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: workoutPlan.id, status: 'active' }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockResolvedValueOnce({ items: [{ id: otherWorkoutPlan.id, status: 'active' }] })
      .mockResolvedValueOnce(otherWorkoutPlan);

    const queryClient = createQueryClient();
    const firstRender = renderWithQueryClient(queryClient);
    await user.press(await screen.findByText('Supino'));
    expect(screen.getByText('Grupo muscular: Peito')).toBeTruthy();

    authState.userId = 'auth-user-b';
    routeState.dayId = otherWorkoutPlan.days[0].id;
    firstRender.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkoutOverviewScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Agachamento')).toBeTruthy();
    expect(screen.queryByText('Grupo muscular: Peito')).toBeNull();
  });
});
