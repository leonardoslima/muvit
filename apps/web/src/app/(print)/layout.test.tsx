import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PrintLayout from './layout';

vi.mock('@/lib/auth-server', () => ({
  requireUser: vi.fn().mockResolvedValue({ id: 'trainer-1' }),
}));

describe('PrintLayout', () => {
  it('protege a rota em uma superfície imprimível sem o shell de navegação', async () => {
    const { container } = render(await PrintLayout({ children: <p>Relatório protegido</p> }));

    expect(screen.getByRole('main', { name: 'Relatório imprimível' })).toBeInTheDocument();
    expect(screen.getByText('Relatório protegido')).toBeInTheDocument();
    expect(container.querySelector('[data-print-shell]')).toBeInTheDocument();
    expect(container.querySelector('[data-app-shell]')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
