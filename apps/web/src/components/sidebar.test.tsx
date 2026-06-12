import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

const navigationState = vi.hoisted(() => ({ pathname: '/students' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

describe('Sidebar', () => {
  it('renders navigation links and user logout controls', () => {
    navigationState.pathname = '/students/123';

    render(<Sidebar user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    expect(screen.getByRole('link', { name: /muvit/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /alunos/i })).toHaveAttribute('href', '/students');
    expect(screen.getByText('Ana Trainer')).toBeInTheDocument();
    expect(screen.getByText('ana@muvit.test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('omits account controls when there is no user', () => {
    navigationState.pathname = '/dashboard';

    render(<Sidebar user={null} />);

    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
  });
});
