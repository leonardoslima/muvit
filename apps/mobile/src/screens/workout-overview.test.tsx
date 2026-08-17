import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { WorkoutOverviewScreen } from './workout-overview';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ push: vi.fn() }));

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

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutOverviewScreen />
    </QueryClientProvider>,
  );
}

describe('WorkoutOverviewScreen', () => {
  it('renders the workout content and starts the guided session', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
      .mockResolvedValueOnce(workoutPlan);

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
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
});
