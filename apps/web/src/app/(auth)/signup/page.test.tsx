import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignupPage from './page';

const authState = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
}));

const navigationState = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signUp: {
      email: authState.signUpEmail,
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

function fillSignup(): void {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@muvit.test' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo123' } });
}

describe('SignupPage', () => {
  beforeEach(() => {
    authState.signUpEmail.mockReset();
    navigationState.refresh.mockReset();
    navigationState.replace.mockReset();
  });

  it('cadastra o papel selecionado e navega para a área correta', async () => {
    authState.signUpEmail.mockResolvedValue({
      data: { user: { role: 'student' } },
      error: null,
    });
    render(<SignupPage />);
    fillSignup();

    fireEvent.click(screen.getByRole('button', { name: 'Sou aluno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() =>
      expect(authState.signUpEmail).toHaveBeenCalledWith({
        name: 'Ana Silva',
        email: 'ana@muvit.test',
        password: 'segredo123',
        role: 'student',
      }),
    );
    expect(navigationState.replace).toHaveBeenCalledWith('/me');
    expect(navigationState.refresh).toHaveBeenCalledOnce();
  });

  it('mantém a validação local dos campos', async () => {
    render(<SignupPage />);

    const submit = screen.getByRole('button', { name: 'Criar conta' });
    const form = submit.closest('form');
    expect(form).not.toBeNull();
    if (!form) return;

    fireEvent.submit(form);

    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Senha precisa de pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(authState.signUpEmail).not.toHaveBeenCalled();
  });

  it('não confirma se o e-mail já possui conta', async () => {
    authState.signUpEmail.mockResolvedValue({
      data: null,
      error: { code: 'USER_ALREADY_EXISTS', status: 422 },
    });
    render(<SignupPage />);
    fillSignup();

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(
      await screen.findByText('Não foi possível criar a conta com os dados informados.'),
    ).toBeInTheDocument();
  });
});
