import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordScreen from '../../app/(auth)/forgot-password';
import LoginScreen from '../../app/(auth)/login';
import ResetPasswordScreen from '../../app/(auth)/reset-password';
import SignupScreen from '../../app/(auth)/signup';
import { mobileRoutes } from '../application/navigation/role-navigation';

vi.mock('react-native', async (importOriginal) => {
  const ReactModule = await import('react');
  const reactNative = await importOriginal<typeof import('react-native')>();

  return {
    ...reactNative,
    KeyboardAvoidingView: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement('KeyboardAvoidingView', props, children),
  };
});

const routerState = vi.hoisted(() => ({
  params: {} as { token?: string | string[]; error?: string },
  push: vi.fn(),
  replace: vi.fn(),
}));
const authState = vi.hoisted(() => ({
  notify: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  refetchSession: vi.fn(),
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  signUpEmail: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => routerState.params,
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

vi.mock('../lib/auth-client', () => ({
  authClient: {
    $store: {
      notify: authState.notify,
      atoms: { session: { get: () => ({ refetch: authState.refetchSession }) } },
    },
    requestPasswordReset: authState.requestPasswordReset,
    resetPassword: authState.resetPassword,
    signIn: { email: authState.signInEmail },
    signOut: authState.signOut,
    signUp: { email: authState.signUpEmail },
  },
}));

vi.mock('../lib/config', () => ({
  config: { apiUrl: 'https://api.muvit.test' },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { color: string; name: string; size: number; testID?: string }) =>
    React.createElement('Ionicons', props),
}));

describe('telas de autenticação mobile', () => {
  beforeEach(() => {
    authState.notify.mockReset();
    routerState.params = {};
    authState.requestPasswordReset.mockReset();
    authState.resetPassword.mockReset();
    authState.refetchSession.mockReset();
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
    expect(pendingButton.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });

    const emailField = screen.getByLabelText('Email');
    const passwordField = screen.getByLabelText('Senha');
    expect(emailField.props.editable).toBe(true);
    expect(passwordField.props.editable).toBe(true);

    await user.type(emailField, '.br');
    expect(screen.getByLabelText('Email').props.value).toBe('ana@example.com.br');

    const signupLink = screen.getByRole('button', { name: 'Criar conta independente' });
    expect(signupLink.props.disabled).toBe(false);
    await user.press(signupLink);
    expect(routerState.push).toHaveBeenCalledWith('/(auth)/signup');

    await user.press(pendingButton);
    expect(authState.signInEmail).toHaveBeenCalledOnce();

    pending.resolve({ data: { user: { role: 'student' } }, error: null });
    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.studentHome);
    });
  });

  it('apresenta a composição v2 de login com marca, copy e campos seguros', () => {
    render(<LoginScreen />);

    expect(screen.getByLabelText('Muvit')).toBeTruthy();
    expect(screen.getByText('Acesse sua conta para continuar.')).toBeTruthy();
    expect(screen.queryByText('SEU TREINO, NO SEU RITMO')).toBeNull();
    expect(screen.queryByTestId('login-email-icon')).toBeNull();
    expect(screen.queryByTestId('login-password-icon')).toBeNull();
    expect(screen.queryByTestId('login-submit-icon')).toBeNull();

    const header = screen.getByRole('header', { name: 'Entrar' });
    expect(header.props.className).toContain('text-[29px]');
    expect(header.props.className).toContain('leading-[40.6px]');
    expect(header.props.className).toContain('font-v2-extrabold');

    expect(screen.getByTestId('login-email-control').props.className).toContain('min-h-[58px]');
    expect(screen.getByTestId('login-password-control').props.className).toContain('min-h-[58px]');
    expect(screen.getByLabelText('Senha').props).toMatchObject({
      placeholder: 'Sua senha',
      secureTextEntry: true,
    });
    expect(screen.queryByRole('button', { name: /mostrar senha|selecionar papel/i })).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('ajusta o login quando o teclado está aberto', () => {
    render(<LoginScreen />);

    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props).toMatchObject({
      behavior: Platform.OS === 'ios' ? 'padding' : 'height',
      style: { flex: 1 },
    });
  });

  it('ajusta o cadastro quando o teclado está aberto', () => {
    render(<SignupScreen />);

    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props).toMatchObject({
      behavior: Platform.OS === 'ios' ? 'padding' : 'height',
      style: { flex: 1 },
    });
  });

  it('mantém o CTA de login vazio habilitado e envia os valores vazios existentes', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: { user: { role: 'student' } },
      error: null,
    });

    render(<LoginScreen />);

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    expect(submitButton.props.disabled).toBe(false);
    await user.press(submitButton);

    await waitFor(() => {
      expect(authState.signInEmail).toHaveBeenCalledWith({ email: '', password: '' });
      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.studentHome);
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

      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.studentHome);
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

  it.each([
    {
      label: '401',
      code: 'INVALID_EMAIL_OR_PASSWORD',
      status: 401,
      message: 'Credenciais inválidas. Verifique os dados e tente novamente.',
    },
    {
      label: '409',
      code: 'CONFLICT',
      status: 409,
      message: 'Não foi possível concluir a solicitação. Tente novamente.',
    },
    {
      label: '429',
      code: 'TOO_MANY_REQUESTS',
      status: 429,
      message: 'Muitas tentativas. Aguarde um momento e tente novamente.',
    },
  ])('preserva o login e mostra a mensagem exata para HTTP $label', async (scenario) => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: null,
      error: { code: scenario.code, status: scenario.status },
    });

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText(scenario.message)).toBeTruthy();
    expect(screen.getByLabelText('Email').props.value).toBe('ana@example.com');
    expect(screen.getByLabelText('Senha').props.value).toBe('senha-errada');
    expect(screen.queryByText('Erro')).toBeNull();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it('preserva o login e mostra a mensagem geral quando a rede rejeita', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockRejectedValueOnce(new Error('network unavailable'));

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Não foi possível concluir a solicitação. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Email').props.value).toBe('ana@example.com');
    expect(screen.getByLabelText('Senha').props.value).toBe('senha-errada');
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it('encaminha login de treinador para o shell do treinador sem logout', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: { user: { role: 'trainer' } },
      error: null,
    });

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'treinador@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(authState.signOut).not.toHaveBeenCalled();
      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.trainerHome);
    });
  });

  it.each([
    { role: 'trainer', destination: mobileRoutes.trainerHome },
    { role: 'student', destination: mobileRoutes.studentHome },
  ])('aguarda a atualização explícita da sessão de $role antes de navegar', async (scenario) => {
    const user = userEvent.setup();
    const pendingSession = createDeferred<void>();
    authState.signInEmail.mockResolvedValueOnce({
      data: { user: { role: scenario.role } },
      error: null,
    });
    authState.refetchSession.mockReturnValueOnce(pendingSession.promise);

    render(<LoginScreen />);
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(authState.refetchSession).toHaveBeenCalledOnce());
    expect(routerState.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Entrando...' }).props.disabled).toBe(true);

    pendingSession.resolve();
    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith(scenario.destination);
    });
  });

  it('preserva o login e permite tentar novamente se a atualização da sessão rejeitar', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValue({
      data: { user: { role: 'trainer' } },
      error: null,
    });
    authState.refetchSession.mockRejectedValueOnce(new Error('network unavailable'));

    render(<LoginScreen />);
    await user.type(screen.getByLabelText('Email'), 'treinador@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Não foi possível concluir a solicitação. Tente novamente.'),
    ).toBeTruthy();
    expect(routerState.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email').props.value).toBe('treinador@example.com');
    expect(screen.getByLabelText('Senha').props.value).toBe('senha-segura');

    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.trainerHome);
    });
  });

  it('encerra sessão e informa role desconhecida recebida no login', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: { user: { role: 'legacy' } },
      error: null,
    });
    authState.signOut.mockResolvedValueOnce(undefined);

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'legado@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Não foi possível identificar o perfil desta conta.'),
    ).toBeTruthy();
    expect(authState.signOut).toHaveBeenCalledOnce();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it('mostra o erro geral se o signOut do papel desconhecido rejeitar', async () => {
    const user = userEvent.setup();
    authState.signInEmail.mockResolvedValueOnce({
      data: { user: { role: 'legacy' } },
      error: null,
    });
    authState.signOut.mockRejectedValueOnce(new Error('signOut unavailable'));

    render(<LoginScreen />);

    await user.type(screen.getByLabelText('Email'), 'legado@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Não foi possível concluir a solicitação. Tente novamente.'),
    ).toBeTruthy();
    expect(authState.signOut).toHaveBeenCalledOnce();
    expect(routerState.replace).not.toHaveBeenCalled();
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

      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.studentHome);
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
      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.studentHome);
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
    expect(routerState.replace).not.toHaveBeenCalledWith(mobileRoutes.studentHome);
  });

  it('mantém o CTA de cadastro vazio habilitado e envia os valores vazios existentes', async () => {
    const user = userEvent.setup();
    authState.signUpEmail.mockResolvedValueOnce({
      data: { user: { role: 'student' } },
      error: null,
    });

    render(<SignupScreen />);

    const submitButton = screen.getByRole('button', { name: 'Criar conta' });
    expect(submitButton.props.disabled).toBe(false);
    await user.press(submitButton);

    await waitFor(() => {
      expect(authState.signUpEmail).toHaveBeenCalledWith({
        name: '',
        email: '',
        password: '',
        role: 'student',
      });
      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.studentHome);
    });
  });

  it('apresenta a composição v2 de cadastro com copy e campos seguros', () => {
    render(<SignupScreen />);

    expect(screen.getByLabelText('Muvit')).toBeTruthy();
    expect(screen.getByText('Comece como aluno independente.')).toBeTruthy();
    expect(screen.queryByText('SEU TREINO, NO SEU RITMO')).toBeNull();
    expect(screen.getByTestId('signup-name-control').props.className).toContain('min-h-[58px]');
    expect(screen.getByTestId('signup-email-control').props.className).toContain('min-h-[58px]');
    expect(screen.getByTestId('signup-password-control').props.className).toContain('min-h-[58px]');
    expect(screen.getByLabelText('Senha').props).toMatchObject({
      placeholder: 'Sua senha',
      secureTextEntry: true,
    });
    expect(screen.queryByRole('button', { name: /mostrar senha|selecionar papel/i })).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('mantém o cadastro pendente acessível sem bloquear campos ou link e ignora o segundo toque', async () => {
    const user = userEvent.setup();
    const pending = createDeferred<{
      data: { user: { role: 'student' } };
      error: null;
    }>();
    authState.signUpEmail.mockReturnValueOnce(pending.promise);

    render(<SignupScreen />);

    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    const pendingButton = screen.getByRole('button', { name: 'Criando...' });
    expect(pendingButton.props.disabled).toBe(true);
    expect(pendingButton.props.accessibilityState).toMatchObject({ busy: true, disabled: true });

    const nameField = screen.getByLabelText('Nome');
    expect(nameField.props.editable).toBe(true);
    await user.type(nameField, ' Aluna');
    expect(screen.getByLabelText('Nome').props.value).toBe('Ana Aluna');

    const loginLink = screen.getByRole('button', { name: /já tenho conta/i });
    expect(loginLink.props.disabled).toBe(false);
    await user.press(loginLink);
    expect(routerState.push).toHaveBeenCalledWith('/(auth)/login');

    await user.press(pendingButton);
    expect(authState.signUpEmail).toHaveBeenCalledOnce();

    pending.resolve({ data: { user: { role: 'student' } }, error: null });
    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.studentHome);
    });
  });

  it.each([
    {
      label: '401',
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Não foi possível concluir a solicitação. Tente novamente.',
    },
    {
      label: '409',
      code: 'USER_ALREADY_EXISTS',
      status: 409,
      message: 'Não foi possível criar a conta com os dados informados.',
    },
    {
      label: '429',
      code: 'TOO_MANY_REQUESTS',
      status: 429,
      message: 'Muitas tentativas. Aguarde um momento e tente novamente.',
    },
  ])('preserva o cadastro e mostra a mensagem exata para HTTP $label', async (scenario) => {
    const user = userEvent.setup();
    authState.signUpEmail.mockResolvedValueOnce({
      data: null,
      error: { code: scenario.code, status: scenario.status },
    });

    render(<SignupScreen />);

    await user.type(screen.getByLabelText('Nome'), 'Ana Aluna');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText(scenario.message)).toBeTruthy();
    expect(screen.getByLabelText('Nome').props.value).toBe('Ana Aluna');
    expect(screen.getByLabelText('Email').props.value).toBe('ana@example.com');
    expect(screen.getByLabelText('Senha').props.value).toBe('senha-segura');
    expect(screen.queryByText('Erro')).toBeNull();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it('preserva o cadastro e mostra a mensagem geral quando a rede rejeita', async () => {
    const user = userEvent.setup();
    authState.signUpEmail.mockRejectedValueOnce(new Error('network unavailable'));

    render(<SignupScreen />);

    await user.type(screen.getByLabelText('Nome'), 'Ana Aluna');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(
      await screen.findByText('Não foi possível concluir a solicitação. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Nome').props.value).toBe('Ana Aluna');
    expect(screen.getByLabelText('Email').props.value).toBe('ana@example.com');
    expect(screen.getByLabelText('Senha').props.value).toBe('senha-segura');
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it('usa o destino de cadastro do link secundário do login', async () => {
    const user = userEvent.setup();

    render(<LoginScreen />);

    await user.press(screen.getByRole('button', { name: 'Criar conta independente' }));

    expect(routerState.push).toHaveBeenCalledWith('/(auth)/signup');
  });

  it('abre a recuperação de senha pelo login', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.press(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect(routerState.push).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('solicita o link nativo e confirma sem revelar se a conta existe', async () => {
    const user = userEvent.setup();
    authState.requestPasswordReset.mockResolvedValueOnce({ data: { status: true }, error: null });
    render(<ForgotPasswordScreen />);
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.press(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByText(/Se existir uma conta/)).toBeTruthy();
    expect(authState.requestPasswordReset).toHaveBeenCalledWith({
      email: 'ana@example.com',
      redirectTo: 'muvit://reset-password',
    });
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('impede email inválido e permite tentar novamente após falha de rede', async () => {
    const user = userEvent.setup();
    authState.requestPasswordReset.mockRejectedValueOnce(new Error('network'));
    render(<ForgotPasswordScreen />);
    await user.press(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByText('Informe um email válido.')).toBeTruthy();
    expect(authState.requestPasswordReset).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.press(screen.getByRole('button', { name: 'Enviar link' }));
    expect(
      await screen.findByText('Não foi possível enviar o link. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Email').props.value).toBe('ana@example.com');
  });

  it('bloqueia toques repetidos enquanto envia o link', async () => {
    const user = userEvent.setup();
    const pending = createDeferred<{ data: { status: boolean }; error: null }>();
    authState.requestPasswordReset.mockReturnValueOnce(pending.promise);
    render(<ForgotPasswordScreen />);
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.press(screen.getByRole('button', { name: 'Enviar link' }));
    const button = screen.getByRole('button', { name: 'Enviando...' });
    expect(button.props.disabled).toBe(true);
    await user.press(button);
    expect(authState.requestPasswordReset).toHaveBeenCalledOnce();
    pending.resolve({ data: { status: true }, error: null });
    expect(await screen.findByText(/Se existir uma conta/)).toBeTruthy();
  });

  it.each([{}, { token: 'token', error: 'INVALID_TOKEN' }, { token: ['a', 'b'] }])(
    'oferece novo link para callback inválido %j',
    (params) => {
      routerState.params = params;
      render(<ResetPasswordScreen />);
      expect(
        screen.getByText('Este link é inválido ou expirou. Solicite um novo link.'),
      ).toBeTruthy();
      expect(screen.queryByLabelText('Nova senha')).toBeNull();
      expect(screen.getByRole('button', { name: 'Solicitar novo link' })).toBeTruthy();
    },
  );

  it('valida tamanho e confirmação antes de redefinir a senha', async () => {
    const user = userEvent.setup();
    routerState.params = { token: 'valid-token' };
    render(<ResetPasswordScreen />);
    await user.type(screen.getByLabelText('Nova senha'), 'curta');
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Use entre 8 e 128 caracteres.')).toBeTruthy();
    await user.type(screen.getByLabelText('Nova senha'), '-segura');
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('As senhas devem ser iguais.')).toBeTruthy();
    expect(authState.resetPassword).not.toHaveBeenCalled();
  });

  it('redefine a senha usando o token e retorna ao login sem criar sessão', async () => {
    const user = userEvent.setup();
    routerState.params = { token: 'valid-token' };
    authState.resetPassword.mockResolvedValueOnce({ data: { status: true }, error: null });
    render(<ResetPasswordScreen />);
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova');
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-nova');
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Senha atualizada. Entre com sua nova senha.')).toBeTruthy();
    expect(authState.resetPassword).toHaveBeenCalledWith({
      newPassword: 'senha-nova',
      token: 'valid-token',
    });
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Voltar para entrar' }));
    expect(routerState.push).toHaveBeenCalledWith('/(auth)/login');
    expect(authState.signInEmail).not.toHaveBeenCalled();
    expect(authState.notify).toHaveBeenCalledWith('$sessionSignal');
  });

  it('explica token rejeitado sem expor o erro do servidor', async () => {
    const user = userEvent.setup();
    routerState.params = { token: 'expired' };
    authState.resetPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'INVALID_TOKEN', message: 'secret' },
    });
    render(<ResetPasswordScreen />);
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova');
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-nova');
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(
      await screen.findByText('Este link é inválido ou expirou. Solicite um novo link.'),
    ).toBeTruthy();
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('limpa o estado do link rejeitado quando outro link chega ao app aberto', async () => {
    const user = userEvent.setup();
    routerState.params = { token: 'expired' };
    authState.resetPassword.mockResolvedValueOnce({ data: null, error: { code: 'INVALID_TOKEN' } });
    const view = render(<ResetPasswordScreen />);
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova');
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-nova');
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText(/Este link é inválido/)).toBeTruthy();
    routerState.params = { token: 'fresh-token' };
    view.rerender(<ResetPasswordScreen />);
    expect(screen.getByLabelText('Nova senha').props.value).toBe('');
  });

  it('mantém os campos e permite repetir uma redefinição após falha de rede', async () => {
    const user = userEvent.setup();
    routerState.params = { token: 'valid-token' };
    authState.resetPassword.mockRejectedValueOnce(new Error('network'));
    render(<ResetPasswordScreen />);
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova');
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-nova');
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(
      await screen.findByText('Não foi possível atualizar a senha. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Nova senha').props.value).toBe('senha-nova');
    const pending = createDeferred<{ data: { status: boolean }; error: null }>();
    authState.resetPassword.mockReturnValueOnce(pending.promise);
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    const button = screen.getByRole('button', { name: 'Salvando...' });
    expect(button.props.disabled).toBe(true);
    await user.press(button);
    expect(authState.resetPassword).toHaveBeenCalledTimes(2);
    pending.resolve({ data: { status: true }, error: null });
    expect(await screen.findByText('Senha atualizada. Entre com sua nova senha.')).toBeTruthy();
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
