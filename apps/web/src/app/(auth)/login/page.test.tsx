import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const authState = vi.hoisted(() => ({
  signInEmail: vi.fn(),
}));

const navigationState = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: authState.signInEmail,
    },
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    refresh: navigationState.refresh,
    replace: navigationState.replace,
  }),
}));

function submitLogin(email = 'ana@muvit.test', password = 'segredo123'): void {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    authState.signInEmail.mockReset();
    navigationState.refresh.mockReset();
    navigationState.replace.mockReset();
  });

  it('não apresenta seletor de papel', () => {
    render(<LoginPage />);

    expect(screen.queryByRole('button', { name: 'Personal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aluno' })).not.toBeInTheDocument();
  });

  it.each([
    ['trainer', '/dashboard'],
    ['student', '/me'],
  ] as const)('autentica sem papel e navega %s para sua área', async (role, destination) => {
    authState.signInEmail.mockResolvedValue({
      data: { user: { role } },
      error: null,
    });
    render(<LoginPage />);

    submitLogin();

    await waitFor(() =>
      expect(authState.signInEmail).toHaveBeenCalledWith({
        email: 'ana@muvit.test',
        password: 'segredo123',
      }),
    );
    expect(navigationState.replace).toHaveBeenCalledWith(destination);
    expect(navigationState.refresh).toHaveBeenCalledOnce();
  });

  it('mostra mensagem estável para credenciais inválidas', async () => {
    authState.signInEmail.mockResolvedValue({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 },
    });
    render(<LoginPage />);

    submitLogin();

    expect(
      await screen.findByText('Credenciais inválidas. Verifique os dados e tente novamente.'),
    ).toBeInTheDocument();
  });
});
