import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from './login';
import SignupScreen from './signup';

const routerState = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
const authState = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  signUpEmail: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: routerState,
  Link: ({ children, href }: { children: ReactNode; href: string }) => {
    if (!React.isValidElement(children)) {
      return children;
    }

    return React.cloneElement(children as React.ReactElement<{ onPress?: () => void }>, {
      onPress: () => routerState.push(href),
    });
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    signIn: { email: authState.signInEmail },
    signOut: authState.signOut,
    signUp: { email: authState.signUpEmail },
  },
}));

vi.mock('../../src/lib/config', () => ({
  config: { apiUrl: 'https://api.muvit.test' },
}));

describe('telas de autenticação mobile', () => {
  beforeEach(() => {
    authState.signInEmail.mockReset();
    authState.signOut.mockReset();
    authState.signUpEmail.mockReset();

    routerState.push.mockReset();
    routerState.replace.mockReset();
  });

  it('mantém o login pendente desabilitado e ignora o segundo toque', async () => {
    const user = userEvent.setup();
    const pending = createDeferred<{
      data: { user: { role: 'student' } };
      error: null;
    }>();
    authState.signInEmail.mockReturnValueOnce(pending.promise);

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    const pendingButton = screen.getByRole('button', { name: 'Entrando...' });
    expect(pendingButton.props.disabled).toBe(true);

    await user.press(pendingButton);
    expect(authState.signInEmail).toHaveBeenCalledOnce();

    pending.resolve({ data: { user: { role: 'student' } }, error: null });
    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('faz login pelo Better Auth sem enviar papel', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: { user: { role: 'student' } },
      error: null,
    });

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(authState.signInEmail).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'senha-segura',
      });

      expect(routerState.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('mostra mensagem estável quando o login falha', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 },
    });

    render(<LoginScreen />);

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();

    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Credenciais inválidas. Verifique os dados e tente novamente.'),
    ).toBeTruthy();
  });

  it('encerra a sessão e rejeita login de treinador', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: { user: { role: 'trainer' } },
      error: null,
    });
    authState.signOut.mockResolvedValueOnce(undefined);

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'treinador@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Este aplicativo é exclusivo para alunos.')).toBeTruthy();
    expect(authState.signOut).toHaveBeenCalledOnce();
    expect(routerState.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('cadastra apenas aluno pelo Better Auth', async () => {
    const user = userEvent.setup();
    authState.signUpEmail.mockResolvedValueOnce({
      data: { user: { role: 'student' } },
      error: null,
    });

    render(<SignupScreen />);

    await user.type(screen.getByLabelText('Nome'), 'Ana Aluna');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(authState.signUpEmail).toHaveBeenCalledWith({
        name: 'Ana Aluna',
        email: 'ana@example.com',
        password: 'senha-segura',
        role: 'student',
      });

      expect(routerState.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('mantém o cadastro pendente desabilitado e ignora o segundo toque', async () => {
    const user = userEvent.setup();
    const pending = createDeferred<{
      data: { user: { role: 'student' } };
      error: null;
    }>();
    authState.signUpEmail.mockReturnValueOnce(pending.promise);

    render(<SignupScreen />);

    await user.type(screen.getByLabelText('Nome'), 'Ana Aluna');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    const pendingButton = screen.getByRole('button', { name: 'Criando...' });
    expect(pendingButton.props.disabled).toBe(true);

    await user.press(pendingButton);
    expect(authState.signUpEmail).toHaveBeenCalledOnce();

    pending.resolve({ data: { user: { role: 'student' } }, error: null });
    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('mostra mensagem quando o cadastro falha', async () => {
    const user = userEvent.setup();
    authState.signUpEmail.mockResolvedValueOnce({
      data: null,
      error: { code: 'USER_ALREADY_EXISTS', status: 409 },
    });

    render(<SignupScreen />);

    await user.type(screen.getByLabelText('Nome'), 'Ana Aluna');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(
      await screen.findByText('Não foi possível criar a conta com os dados informados.'),
    ).toBeTruthy();
    expect(routerState.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('usa o destino de cadastro do link secundário do login', async () => {
    const user = userEvent.setup();

    render(<LoginScreen />);

    await user.press(screen.getByRole('button', { name: 'Criar conta independente' }));

    expect(routerState.push).toHaveBeenCalledWith('/(auth)/signup');
  });

  it('usa o destino de login do link secundário do cadastro', async () => {
    const user = userEvent.setup();

    render(<SignupScreen />);

    await user.press(screen.getByRole('button', { name: /tenho conta/ }));

    expect(routerState.push).toHaveBeenCalledWith('/(auth)/login');
  });
});

function createDeferred<T>() {
  let resolveDeferred: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });

  return { promise, resolve: resolveDeferred };
}
