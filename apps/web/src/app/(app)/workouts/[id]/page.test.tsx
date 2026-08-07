import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkoutsLayout from '../layout';
import WorkoutDetailPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getWorkoutPlansById: vi.fn().mockResolvedValue({
    data: {
      id: 'plan-1',
      studentId: 'student-1',
      name: 'Hipertrofia A',
      status: 'active',
      notes: 'Progressão semanal',
      days: [],
    },
  }),
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

describe('WorkoutDetailPage', () => {
  it('preserva padding e gap próprios dentro do layout full-height', async () => {
    render(
      <WorkoutsLayout>
        {await WorkoutDetailPage({ params: Promise.resolve({ id: 'plan-1' }) })}
      </WorkoutsLayout>,
    );

    const legacySurface = screen
      .getByRole('heading', { name: 'Hipertrofia A' })
      .closest('[data-app-content="padded"]');
    expect(legacySurface).toHaveClass('gap-7', 'px-4', 'py-6', 'lg:px-10', 'lg:py-8');
    expect(legacySurface?.parentElement).toHaveAttribute('data-app-content', 'full-height');
    expect(screen.getByRole('link', { name: /voltar para aluno/i })).toHaveAttribute(
      'href',
      '/students/student-1',
    );
  });
});
