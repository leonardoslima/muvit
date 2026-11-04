import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

const authState = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

const navigationState = vi.hoisted(() => ({
  pathname: '/students',
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signOut: authState.signOut,
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    refresh: navigationState.refresh,
    replace: navigationState.replace,
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    authState.signOut.mockReset();
    authState.signOut.mockResolvedValue({ data: null, error: null });
    navigationState.refresh.mockReset();
    navigationState.replace.mockReset();
  });

  it('renderiza a navegação principal completa e destaca rotas filhas', () => {
    navigationState.pathname = '/settings/profile';

    render(<Sidebar user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /muvit/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Alunos' })).toHaveAttribute('href', '/students');
    expect(screen.getByRole('link', { name: 'Treinos' })).toHaveAttribute('href', '/workouts');
    expect(screen.getByRole('link', { name: 'Exercícios' })).toHaveAttribute('href', '/exercises');
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'href',
      '/settings/profile',
    );
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('exibe nome, e-mail, avatar e controle de logout do treinador', () => {
    render(<Sidebar user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    expect(screen.getByText('Ana Trainer')).toBeInTheDocument();
    expect(screen.getByText('ana@muvit.test')).toBeInTheDocument();
    expect(screen.getByText('AT')).toBeInTheDocument();
    const logoutButton = screen.getByRole('button', { name: 'Sair' });
    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton.closest('form')).toBeNull();
  });

  it('encerra a sessão e redireciona para o login', async () => {
    render(<Sidebar user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(authState.signOut).toHaveBeenCalledOnce());
    expect(navigationState.replace).toHaveBeenCalledWith('/login');
    expect(navigationState.refresh).toHaveBeenCalledOnce();
  });

  it('mantém o usuário na página quando o logout retorna erro', async () => {
    authState.signOut.mockResolvedValue({
      data: null,
      error: { status: 500 },
    });
    render(<Sidebar user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível sair. Tente novamente.',
    );
    expect(navigationState.replace).not.toHaveBeenCalled();
    expect(navigationState.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
  });

  it('mantém o usuário na página quando o logout rejeita', async () => {
    authState.signOut.mockRejectedValue(new Error('falha interna'));
    render(<Sidebar user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível sair. Tente novamente.',
    );
    expect(navigationState.replace).not.toHaveBeenCalled();
    expect(navigationState.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
  });

  it('omits account controls when there is no user', () => {
    navigationState.pathname = '/dashboard';

    render(<Sidebar user={null} />);

    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
  });
});
