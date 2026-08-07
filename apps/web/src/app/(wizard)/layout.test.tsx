import { requireUser } from '@/lib/auth-server';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WizardLayout from './layout';

vi.mock('@/lib/auth-server', () => ({ requireUser: vi.fn().mockResolvedValue({ id: 'user-1' }) }));

describe('WizardLayout', () => {
  it('preserva autenticação sem montar sidebar ou padding do shell', async () => {
    const { container } = render(await WizardLayout({ children: <div>Wizard isolado</div> }));

    expect(requireUser).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Wizard isolado').parentElement).toHaveClass('min-h-dvh');
    expect(container.querySelector('[data-app-shell]')).toBeNull();
    expect(container.querySelector('[data-app-content]')).toBeNull();
  });
});
