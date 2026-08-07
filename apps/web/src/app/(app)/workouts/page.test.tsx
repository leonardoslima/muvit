import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkoutsLayout from './layout';
import WorkoutsPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getStudents: vi.fn().mockResolvedValue({
    data: { items: [{ id: 'student-1', name: 'Ana Lima', email: 'ana@muvit.test' }] },
  }),
}));

describe('WorkoutsPage', () => {
  it('preserva padding e gap próprios dentro do layout full-height', async () => {
    render(<WorkoutsLayout>{await WorkoutsPage()}</WorkoutsLayout>);

    const legacySurface = screen
      .getByRole('heading', { name: 'Treinos' })
      .closest('[data-app-content="padded"]');
    expect(legacySurface).toHaveClass('gap-7', 'px-4', 'py-6', 'lg:px-10', 'lg:py-8');
    expect(legacySurface?.parentElement).toHaveAttribute('data-app-content', 'full-height');
    expect(screen.getByRole('link', { name: /ana lima/i })).toBeInTheDocument();
  });
});
