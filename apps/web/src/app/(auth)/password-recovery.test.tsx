import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from './forgot-password/page';
import ResetPasswordPage from './reset-password/page';

const state = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  signOut: vi.fn(),
  query: 'token=valid-token',
}));
vi.mock('@/lib/auth-client', () => ({ authClient: state }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(state.query) }));

function submitReset(password = 'novaSenha123', confirmation = password): void {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
    target: { value: confirmation },
  });
  const form = screen.getByRole('button', { name: 'Redefinir senha' }).closest('form');
  if (!form) throw new Error('Formulário de redefinição ausente.');
  fireEvent.submit(form);
}

describe('recuperação de senha', () => {
  beforeEach(() => {
    state.query = 'token=valid-token';
    state.requestPasswordReset.mockReset();
    state.resetPassword.mockReset();
    state.signOut.mockReset();
    state.signOut.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('envia solicitação ao callback local e apresenta confirmação sem revelar conta', async () => {
    state.requestPasswordReset.mockResolvedValue({ data: { status: true }, error: null });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@muvit.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Se houver uma conta');
    expect(state.requestPasswordReset).toHaveBeenCalledWith({
      email: 'ana@muvit.test',
      redirectTo: `${window.location.origin}/reset-password`,
    });
    expect(screen.queryByRole('button', { name: 'Enviar link' })).not.toBeInTheDocument();
  });

  it('bloqueia envio durante a solicitação', () => {
    state.requestPasswordReset.mockReturnValue(new Promise(() => {}));
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@muvit.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });

  it.each(['response', 'network'])(
    'permite tentar novamente após erro %s sem expor detalhes',
    async (kind: string) => {
      if (kind === 'response')
        state.requestPasswordReset.mockResolvedValue({
          data: null,
          error: { message: 'segredo interno' },
        });
      else state.requestPasswordReset.mockRejectedValue(new Error('segredo interno'));
      render(<ForgotPasswordPage />);
      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@muvit.test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente');
      expect(screen.queryByText('segredo interno')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enviar link' })).toBeEnabled();
    },
  );

  it.each(['', 'error=INVALID_TOKEN', 'token=valid&error=INVALID_TOKEN'])(
    'oferece novo link quando callback é inválido: %s',
    (query: string) => {
      state.query = query;
      render(<ResetPasswordPage />);
      expect(screen.getByRole('alert')).toHaveTextContent('Link inválido ou expirado');
      expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute(
        'href',
        '/forgot-password',
      );
      expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    },
  );

  it.each([
    ['curta', 'curta', '8 caracteres'],
    ['novaSenha123', 'diferente', 'senhas não coincidem'],
  ])(
    'rejeita senha inválida ou confirmação diferente',
    (password: string, confirmation: string, message: string) => {
      render(<ResetPasswordPage />);
      submitReset(password, confirmation);
      expect(screen.getByRole('alert')).toHaveTextContent(message);
      expect(state.resetPassword).not.toHaveBeenCalled();
    },
  );

  it('troca senha com token e oferece retorno ao login sem autenticar automaticamente', async () => {
    state.resetPassword.mockResolvedValue({ data: { status: true }, error: null });
    render(<ResetPasswordPage />);
    submitReset();
    expect(await screen.findByRole('status')).toHaveTextContent('Senha redefinida');
    expect(state.resetPassword).toHaveBeenCalledWith({
      newPassword: 'novaSenha123',
      token: 'valid-token',
    });
    expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('aguarda limpeza da sessão anterior antes de mostrar sucesso e entrada', async () => {
    state.resetPassword.mockResolvedValue({ data: { status: true }, error: null });
    let finishSignOut: (() => void) | undefined;
    state.signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSignOut = resolve;
      }),
    );
    render(<ResetPasswordPage />);
    submitReset();
    await waitFor(() => expect(state.signOut).toHaveBeenCalledOnce());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voltar para entrar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redefinindo…' })).toBeDisabled();
    await act(async () => {
      finishSignOut?.();
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Senha redefinida');
    expect(state.resetPassword.mock.invocationCallOrder[0]).toBeLessThan(
      state.signOut.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each(['response', 'network'])(
    'preserva troca concluída quando limpeza da sessão falha: %s',
    async (kind: string) => {
      state.resetPassword.mockResolvedValue({ data: { status: true }, error: null });
      if (kind === 'response')
        state.signOut.mockResolvedValue({ data: null, error: { code: 'INTERNAL_SERVER_ERROR' } });
      else state.signOut.mockRejectedValue(new Error('sem rede'));
      render(<ResetPasswordPage />);
      submitReset();
      expect(await screen.findByRole('status')).toHaveTextContent('Senha redefinida');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute(
        'href',
        '/login',
      );
    },
  );

  it('rejeita senha acima de 128 caracteres antes de chamar a API', () => {
    render(<ResetPasswordPage />);
    submitReset('a'.repeat(129));
    expect(screen.getByRole('alert')).toHaveTextContent('no máximo 128 caracteres');
    expect(state.resetPassword).not.toHaveBeenCalled();
  });

  it('aceita senha no limite de 128 caracteres', async () => {
    state.resetPassword.mockResolvedValue({ data: { status: true }, error: null });
    render(<ResetPasswordPage />);
    submitReset('a'.repeat(128));
    expect(await screen.findByRole('status')).toHaveTextContent('Senha redefinida');
  });

  it('remove formulário e oferece novo link quando servidor rejeita token', async () => {
    state.resetPassword.mockResolvedValue({ data: null, error: { code: 'INVALID_TOKEN' } });
    render(<ResetPasswordPage />);
    submitReset();
    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido ou expirado');
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('mantém formulário para tentar novamente após falha de rede', async () => {
    state.resetPassword.mockRejectedValue(new Error('falha interna'));
    render(<ResetPasswordPage />);
    submitReset();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente');
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toBeEnabled();
  });

  it('bloqueia envio durante a redefinição', () => {
    state.resetPassword.mockReturnValue(new Promise(() => {}));
    render(<ResetPasswordPage />);
    submitReset();
    expect(screen.getByRole('button', { name: 'Redefinindo…' })).toBeDisabled();
  });

  it('permite corrigir falha do servidor sem revelar detalhe interno', async () => {
    state.resetPassword.mockResolvedValue({
      data: null,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'segredo interno' },
    });
    render(<ResetPasswordPage />);
    submitReset();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente');
    expect(screen.queryByText('segredo interno')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toBeEnabled();
  });
});
