import { getExercises } from '@/lib/api/sdk.gen';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutsLayout from '../layout';
import NewWorkoutPage from './page';

vi.mock('@/components/top-bar', () => ({ TopBar: () => <div>Novo treino</div> }));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getStudentsById: vi.fn().mockResolvedValue({
    data: {
      id: 'student-1',
      name: 'Ana Lima',
    },
  }),
  getExercises: vi.fn(async (options: { query?: { limit?: number } }) => {
    if ((options.query?.limit ?? 0) > 100) {
      return { error: { message: 'Limit maximo excedido.' } };
    }

    return {
      data: {
        items: [{ id: 'exercise-1', name: 'Supino reto', muscleGroup: 'chest' }],
      },
    };
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

describe('NewWorkoutPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega exercicios com o limite aceito pela API para preencher o seletor', async () => {
    render(
      <WorkoutsLayout>
        {await NewWorkoutPage({ searchParams: Promise.resolve({ studentId: 'student-1' }) })}
      </WorkoutsLayout>,
    );

    const legacySurface = screen.getByText('Novo treino').closest('[data-app-content="padded"]');
    expect(legacySurface).toHaveClass('gap-7', 'px-4', 'py-6', 'lg:px-10', 'lg:py-8');
    expect(legacySurface?.parentElement).toHaveAttribute('data-app-content', 'full-height');

    expect(getExercises).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ limit: 100, scope: 'all' }),
      }),
    );
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/workouts');

    fireEvent.click(screen.getByRole('button', { name: /exerc/i }));

    expect(screen.getByRole('button', { name: /supino reto/i })).toBeInTheDocument();
  });
});
