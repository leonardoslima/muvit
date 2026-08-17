import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { LogWorkoutScreen } from './log-workout';

const routerState = vi.hoisted(() => ({
  back: vi.fn(),
  dayId: '22222222-2222-4222-8222-222222222222',
}));

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const storageState = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: { back: routerState.back },
  useLocalSearchParams: () => ({ dayId: routerState.dayId }),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: storageState,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LogWorkoutScreen />
    </QueryClientProvider>,
  );
}

describe('LogWorkoutScreen', () => {
  it('renders unavailable state when loading fails', async () => {
    apiState.request.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino indisponivel')).toBeTruthy();
  });

  it('edits sets and finishes workout', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({
        items: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            studentId: '55555555-5555-4555-8555-555555555555',
            trainerId: null,
            name: 'Plano A',
            startDate: null,
            endDate: null,
            status: 'active',
            createdAt: '2026-08-15T12:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
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
                loadKg: 40,
                restSeconds: 60,
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
      })
      .mockResolvedValueOnce({ id: 'log-id' })
      .mockResolvedValueOnce(undefined);

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    await user.press(screen.getByText('1'));
    await user.type(screen.getByPlaceholderText('reps'), '12');
    await user.type(screen.getByPlaceholderText('kg'), '42');
    await user.press(screen.getByText('Finalizar treino'));

    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce());
  });
});
