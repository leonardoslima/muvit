import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkoutOverviewScreen } from './workout-overview';

const authState = vi.hoisted(() => ({ userId: 'auth-user-a' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ push: vi.fn() }));

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
  useLocalSearchParams: () => ({ dayId: 'day-id' }),
}));

const workoutPlan = {
  id: 'plan-id',
  name: 'Plano A',
  days: [
    {
      id: 'day-id',
      label: 'Treino A',
      exercises: [
        {
          id: 'workout-exercise-id',
          sets: 3,
          reps: '10',
          loadKg: 20,
          restSeconds: 60,
          notes: 'Controle a descida.',
          exercise: { name: 'Supino', muscleGroup: 'Peito' },
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
    apiState.request.mockReset();
    routerState.push.mockReset();
  });

  it('renders the workout content and starts the guided session', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
      .mockResolvedValueOnce(workoutPlan);

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('1 exercícios · ~6 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Iniciar treino' }));

    expect(routerState.push).toHaveBeenCalledWith('/session/day-id');
  });

  it('keeps exercise details available from the overview', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
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
      days: [
        {
          ...workoutPlan.days[0],
          label: 'Treino B',
          exercises: [
            {
              ...workoutPlan.days[0].exercises[0],
              exercise: { name: 'Agachamento', muscleGroup: 'Pernas' },
            },
          ],
        },
      ],
    };
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
      .mockResolvedValueOnce(workoutPlan)
      .mockResolvedValueOnce({ items: [{ id: 'plan-b-id', status: 'active' }] })
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
    expect(routerState.push).toHaveBeenCalledWith('/session/day-id');
  });
});
