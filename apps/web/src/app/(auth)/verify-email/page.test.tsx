import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VerifyEmailPage from './page';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  send: vi.fn(),
  signOut: vi.fn(),
  verify: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: mocks.getSession,
    sendVerificationEmail: mocks.send,
    signOut: mocks.signOut,
    verifyEmail: mocks.verify,
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

describe('confirmação de email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/verify-email');
    mocks.getSession.mockResolvedValue({ data: null });
  });
  it('oferece reenvio genérico sem sessão e não presume sucesso', async () => {
    mocks.send.mockResolvedValue({ error: null });
    render(<VerifyEmailPage />);
    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    await waitFor(() =>
      expect(mocks.send).toHaveBeenCalledWith({
        email: 'ana@example.com',
        callbackURL: `${window.location.origin}/verify-email`,
      }),
    );
    expect(await screen.findByText(/Se houver uma conta/)).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('libera destino somente quando a sessão confirma o email', async () => {
    mocks.getSession.mockResolvedValue({
      data: { user: { email: 'ana@example.com', role: 'trainer', emailVerified: true } },
    });
    render(<VerifyEmailPage />);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard'));
  });
  it('usa a sessão para confirmar token de troca e remove token da URL', async () => {
    window.history.replaceState(null, '', '/verify-email#token=token-de-teste');
    mocks.verify.mockResolvedValue({ data: { status: true }, error: null });
    mocks.getSession.mockResolvedValue({
      data: { user: { email: 'novo@example.com', role: 'trainer', emailVerified: true } },
    });
    render(<VerifyEmailPage />);
    await waitFor(() =>
      expect(mocks.verify).toHaveBeenCalledWith({ query: { token: 'token-de-teste' } }),
    );
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('não libera a área privada se o link pertence a outra conta', async () => {
    window.history.replaceState(null, '', '/verify-email#token=token-de-teste');
    mocks.verify.mockResolvedValue({ data: null, error: { code: 'INVALID_USER' } });
    mocks.getSession.mockResolvedValue({
      data: { user: { email: 'outra@example.com', role: 'trainer', emailVerified: true } },
    });
    render(<VerifyEmailPage />);
    expect(await screen.findByText(/Entre na conta correta/)).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });
});
