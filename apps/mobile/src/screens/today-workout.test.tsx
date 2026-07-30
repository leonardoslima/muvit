import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodayWorkoutScreen } from './today-workout';

const authState = vi.hoisted(() => ({ userId: 'auth-user-a' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
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

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TodayWorkoutScreen />
    </QueryClientProvider>,
  );
}

const activeWorkout = {
  id: 'plan-id',
  name: 'Plano A',
  days: [
    {
      id: 'day-id',
      label: 'Treino A',
      exercises: [
        {
          id: 'we-1',
          sets: 3,
          reps: '10',
          restSeconds: 60,
          notes: null,
          exercise: { name: 'Supino', muscleGroup: 'chest' },
        },
      ],
    },
  ],
};

describe('TodayWorkoutScreen', () => {
  it('renders empty state when there is no active workout', async () => {
    beforeEach(() => {
      authState.userId = 'auth-user-a';
      apiState.request.mockReset();
      storageState.getItem.mockReset();
      storageState.removeItem.mockReset();
      storageState.setItem.mockReset();
    });

    apiState.request.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Sem treino ativo')).toBeTruthy();
    expect(screen.getByText(/professor publicar um treino ativo/i)).toBeTruthy();
  });

  it('renders loaded workout', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
      .mockResolvedValueOnce(activeWorkout)
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino de hoje')).toBeTruthy();
    expect(screen.getByText('Plano A - Treino A')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Iniciar treino')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Sem treino ativo')).toBeNull());
  });

  it('renders stale offline badge from cached workout', async () => {
    apiState.request.mockRejectedValueOnce(new Error('offline'));
    storageState.getItem.mockResolvedValueOnce(
      JSON.stringify({
        plan: { id: 'plan-id', name: 'Plano A' },
        day: activeWorkout.days[0],
      }),
    );

    renderWithQueryClient();

    expect(await screen.findByText('offline')).toBeTruthy();
    expect(screen.getByText('Plano A - Treino A')).toBeTruthy();
  });

  it('isolates the offline cache when the authenticated account changes', async () => {
    apiState.request.mockRejectedValue(new Error('offline'));
    storageState.getItem.mockResolvedValue(
      JSON.stringify({
        plan: { id: 'plan-id', name: 'Plano A' },
        day: activeWorkout.days[0],
      }),
    );

    const firstRender = renderWithQueryClient();

    expect(await screen.findByText('offline')).toBeTruthy();
    expect(storageState.getItem).toHaveBeenLastCalledWith('today-workout:auth-user-a');

    authState.userId = 'auth-user-b';
    const nextQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    firstRender.rerender(
      <QueryClientProvider client={nextQueryClient}>
        <TodayWorkoutScreen key="auth-user-b" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('offline')).toBeTruthy();
    expect(storageState.getItem).toHaveBeenLastCalledWith('today-workout:auth-user-b');
  });

  it('opens and closes the exercise details modal', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
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

    expect(screen.getByText('Grupo: chest')).toBeTruthy();
    expect(screen.getByText('Controlar cadencia')).toBeTruthy();

    await user.press(screen.getByText('Fechar'));

    await waitFor(() => expect(screen.queryByText('Grupo: chest')).toBeNull());
  });
});
