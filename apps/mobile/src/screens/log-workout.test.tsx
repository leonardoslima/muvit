import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { LogWorkoutScreen } from './log-workout';

const routerState = vi.hoisted(() => ({ back: vi.fn(), dayId: 'day-id' }));
const authState = vi.hoisted(() => ({ userId: 'student-id' }));
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

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
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
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
      .mockResolvedValueOnce({
        id: 'plan-id',
        days: [
          {
            id: 'day-id',
            label: 'Treino A',
            exercises: [
              {
                id: 'we-1',
                sets: 1,
                reps: '10',
                loadKg: 40,
                exercise: { name: 'Supino' },
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
