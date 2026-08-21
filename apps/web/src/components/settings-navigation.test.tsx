import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsNavigation } from './settings-navigation';

const pathname = { value: '/settings/profile' };

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}));

describe('SettingsNavigation', () => {
  it('marca a seção atual e desabilita os itens ainda indisponíveis', () => {
    render(<SettingsNavigation />);

    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute(
      'href',
      '/settings/notifications',
    );
    expect(screen.getByText('Integrações')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Privacidade e segurança')).toHaveAttribute('aria-disabled', 'true');
  });
});
