import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TodayWorkoutScreen } from './today-workout';

const authState = vi.hoisted(() => ({ userId: 'student-id' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const storageState = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
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
});
