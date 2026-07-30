import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressScreen } from './progress';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProgressScreen />
    </QueryClientProvider>,
  );
}

describe('ProgressScreen', () => {
  it('renders empty state', async () => {
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderWithQueryClient();

    expect(await screen.findByText('Nenhuma avaliacao registrada.')).toBeTruthy();
  });

  it('renders assessment cards', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'assessment-id',
          date: '2026-06-12',
          weightKg: 80,
          bodyFatPct: 19,
          notes: 'Evoluiu',
        },
      ],
    });

    renderWithQueryClient();

    expect(await screen.findByText('2026-06-12')).toBeTruthy();
    expect(screen.getByText('Peso: 80 kg')).toBeTruthy();
    expect(screen.getByText('Gordura: 19%')).toBeTruthy();
    expect(screen.getByText('Evoluiu')).toBeTruthy();
  });

  it('renders metric fallbacks when values and notes are absent', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'assessment-id',
          date: '2026-06-12',
          weightKg: null,
          bodyFatPct: null,
          notes: null,
        },
      ],
    });

    renderWithQueryClient();

    expect(await screen.findByText('2026-06-12')).toBeTruthy();
    expect(screen.getByText('Peso: - kg')).toBeTruthy();
    expect(screen.getByText('Gordura: -%')).toBeTruthy();
    expect(screen.queryByText('Evoluiu')).toBeNull();
  });
});
