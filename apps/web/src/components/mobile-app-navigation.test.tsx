import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileAppNavigation } from './mobile-app-navigation';

const authState = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

const navigationState = vi.hoisted(() => ({
  pathname: '/reports',
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut: authState.signOut },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    refresh: navigationState.refresh,
    replace: navigationState.replace,
  }),
}));

describe('MobileAppNavigation', () => {
  beforeEach(() => {
    authState.signOut.mockReset();
    authState.signOut.mockResolvedValue({ data: null, error: null });
    navigationState.refresh.mockReset();
    navigationState.replace.mockReset();
    navigationState.pathname = '/reports';
  });

  it('abre o menu compacto com links, estado ativo e identidade do treinador', () => {
    render(<MobileAppNavigation user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu principal' }));

    expect(screen.getByRole('dialog', { name: 'Menu principal' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'href',
      '/settings/profile',
    );
    expect(screen.getByText('Ana Trainer')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil de Ana Trainer')).toHaveTextContent('AT');
  });

  it('fecha o menu ao pressionar Escape', async () => {
    render(<MobileAppNavigation user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu principal' }));

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Abrir menu principal' })).toHaveFocus();
  });

  it('encerra a sessão pelo menu compacto', async () => {
    render(<MobileAppNavigation user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu principal' }));

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(authState.signOut).toHaveBeenCalledOnce());
    expect(navigationState.replace).toHaveBeenCalledWith('/login');
    expect(navigationState.refresh).toHaveBeenCalledOnce();
  });
});
