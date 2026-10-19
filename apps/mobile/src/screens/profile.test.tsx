import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrainerProfileScreen from '../../app/(trainer)/trainer/profile';
import { colors } from '../lib/design-system/tokens';
import { ProfileScreen } from './profile';

type SessionUser = { id: string; name: string; email: string; role: string };

const routerState = vi.hoisted(() => ({ replace: vi.fn() }));
const authState = vi.hoisted(() => ({
  signOut: vi.fn(),
  session: {
    data: {
      user: {
        id: 'auth-user-id',
        name: 'Ana Aluna',
        email: 'ana@example.com',
        role: 'student',
      },
    } as { user: SessionUser } | null,
    isPending: false,
  },
}));
const queryState = vi.hoisted(() => ({ clear: vi.fn() }));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    signOut: authState.signOut,
    useSession: () => authState.session,
  },
}));

vi.mock('../lib/query-client', () => ({
  queryClient: queryState,
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => ({ bindCurrentSession: vi.fn() }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

vi.mock('expo-router', () => ({
  router: routerState,
}));

const defaultUser: SessionUser = {
  id: 'auth-user-id',
  name: 'Ana Aluna',
  email: 'ana@example.com',
  role: 'student',
};

function setSession(user: SessionUser | null, isPending = false) {
  authState.session.data = user ? { user } : null;
  authState.session.isPending = isPending;
}

function renderWithQueryClient(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    authState.signOut.mockReset();
    authState.session.data = { user: defaultUser };
    authState.session.isPending = false;
    queryState.clear.mockReset();
    routerState.replace.mockReset();
  });

  it('renderiza a identidade do aluno sem a jornada antiga', () => {
    setSession({ ...defaultUser, name: 'Maria Clara Silva', email: 'maria@example.com' });

    renderWithQueryClient(<ProfileScreen />);

    expect(screen.getByLabelText('Muvit')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Perfil' })).toBeTruthy();
    expect(screen.getByText('MC')).toBeTruthy();
    expect(screen.getByText('Maria Clara Silva')).toBeTruthy();
    expect(screen.getByText('maria@example.com')).toBeTruthy();
    expect(screen.getByText('Aluno independente')).toBeTruthy();

    const profileHeading = screen.getByTestId('profile-heading');
    const profileTitle = screen.getByTestId('profile-title');
    const accountSubtitle = screen.getByTestId('profile-subtitle');
    expect(within(profileHeading).getByTestId('profile-title')).toBeTruthy();
    expect(within(profileHeading).getByTestId('profile-subtitle')).toBeTruthy();
    expect(
      screen.getAllByTestId(/profile-(heading|card)/).map((section) => section.props.testID),
    ).toEqual(['profile-heading', 'profile-card']);
    expect(profileHeading.props.style).toMatchObject({ gap: 8, paddingHorizontal: 6 });
    expect(screen.getByText('Informações da sua conta.')).toBe(accountSubtitle);

    const title = screen.getByRole('header', { name: 'Perfil' });
    expect(title.props.className).toContain('text-[29px]');
    expect(title.props.className).toContain('leading-[40.6px]');
    expect(title.props.className).toContain('font-v2-extrabold');

    const contentStyle = StyleSheet.flatten(
      screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle,
    );
    expect(contentStyle).toMatchObject({ gap: 24, paddingHorizontal: 16, paddingVertical: 24 });
    expect(screen.queryByText('Treinos e evolução')).toBeNull();
    expect(
      screen.queryByText('Seus treinos e avaliações aparecem aqui conforme você avança.'),
    ).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /editar|foto/i })).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('compõe cartão e identidade com dimensões v2 sem cortar textos longos', () => {
    const name = 'Alexandria Maria de Alcântara Pessoa, profissional de movimento e saúde';
    const email = 'alexandria.maria.de.alcantara.pessoa.profissional@example.com';
    const accountType = 'Profissional responsável pelo acompanhamento individualizado';
    setSession({ ...defaultUser, name, email });

    renderWithQueryClient(<ProfileScreen accountType={accountType} />);

    const cardClassName = screen.getByTestId('profile-card').props.className;
    expect(cardClassName).toContain('border-0');
    expect(cardClassName).toContain('rounded-[26px]');
    expect(cardClassName).toContain('p-6');
    expect(cardClassName).toContain('gap-3');

    const avatarClassName = screen.getByTestId('profile-avatar').props.className;
    expect(avatarClassName).toContain('h-[72px]');
    expect(avatarClassName).toContain('w-[72px]');
    expect(avatarClassName).toContain('rounded-[36px]');

    const nameText = screen.getByText(name);
    expect(nameText.props.numberOfLines).toBeUndefined();
    expect(nameText.props.className).toContain('text-[25px]');
    expect(nameText.props.className).toContain('font-v2-extrabold');
    expect(nameText.props.className).toContain('text-center');
    expect(nameText.props.className).toContain('w-full');

    const emailText = screen.getByText(email);
    expect(emailText.props.numberOfLines).toBeUndefined();
    expect(emailText.props.className).toContain('text-[14px]');
    expect(emailText.props.className).toContain('text-center');
    expect(emailText.props.className).toContain('w-full');

    const accountTypeText = screen.getByText(accountType);
    expect(accountTypeText.props.numberOfLines).toBeUndefined();
    expect(accountTypeText.props.className).toContain('text-[14px]');
    expect(accountTypeText.props.className).toContain('font-v2-bold');
    expect(accountTypeText.props.className).toContain('text-center');
    expect(accountTypeText.props.className).toContain('w-full');
  });

  it('usa fallbacks de aluno quando a sessão resolvida não contém usuário', () => {
    setSession(null);

    renderWithQueryClient(<ProfileScreen />);

    expect(screen.getByText('Aluno independente')).toBeTruthy();
    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('Sem email cadastrado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
  });

  it('usa o nome e as iniciais de fallback quando o nome contém só espaços', () => {
    setSession({ ...defaultUser, name: ' \t  ' });

    renderWithQueryClient(<ProfileScreen />);

    expect(screen.getByText('Aluno')).toBeTruthy();
    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
  });

  it('não mostra identidade nem saída enquanto a sessão está pendente', () => {
    setSession(defaultUser, true);

    renderWithQueryClient(<ProfileScreen />);

    expect(screen.getByText('Carregando perfil')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Carregando perfil' })).toBeTruthy();
    expect(screen.queryByText('Ana Aluna')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull();
    expect(screen.getByTestId('profile-loading').props.className).not.toContain('bg-v2-surface');
    expect(screen.getByTestId('profile-loading').props.style).toBeUndefined();
  });

  it('usa fallbacks de treinador pela rota sem exibir jornada', () => {
    setSession(null);

    renderWithQueryClient(<TrainerProfileScreen />);

    expect(screen.getAllByText('Treinador')).toHaveLength(2);
    expect(screen.getByText('TR')).toBeTruthy();
    expect(screen.queryByText('Acompanhe seus alunos no Muvit.')).toBeNull();
    expect(screen.queryByText('Treinos e evolução')).toBeNull();
    expect(screen.getByText('Informações da sua conta.')).toBeTruthy();
  });

  it('preserva a identidade e impede nova chamada enquanto o logout está pendente', async () => {
    const user = userEvent.setup();
    let resolveSignOut: () => void = () => undefined;
    authState.signOut.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = () => resolve();
        }),
    );

    renderWithQueryClient(<ProfileScreen />);
    await user.press(screen.getByRole('button', { name: 'Sair' }));

    const pendingButton = screen.getByRole('button', { name: 'Saindo...' });
    expect(pendingButton.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(screen.getByText('Ana Aluna')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('Aluno independente')).toBeTruthy();
    expect(queryState.clear).not.toHaveBeenCalled();
    expect(routerState.replace).not.toHaveBeenCalled();

    await user.press(pendingButton);
    expect(authState.signOut).toHaveBeenCalledOnce();

    resolveSignOut();
    await waitFor(() => {
      expect(queryState.clear).toHaveBeenCalledOnce();
      expect(routerState.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('limpa o cache no sucesso e navega ao login', async () => {
    const user = userEvent.setup();
    authState.signOut.mockResolvedValueOnce(undefined);

    renderWithQueryClient(<ProfileScreen />);
    await user.press(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(authState.signOut).toHaveBeenCalledOnce();
      expect(queryState.clear).toHaveBeenCalledOnce();
      expect(routerState.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('preserva o erro e o perfil após rejeição, limpa o cache e permite tentar novamente', async () => {
    const user = userEvent.setup();
    authState.signOut.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);

    renderWithQueryClient(<ProfileScreen />);
    await user.press(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Não foi possível sair agora.')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Erro')).toBeNull();
    expect(screen.getByText('Ana Aluna')).toBeTruthy();
    expect(screen.getByTestId('profile-error').props.style.backgroundColor).toBe(colors.errorBg);
    expect(queryState.clear).toHaveBeenCalledOnce();
    expect(routerState.replace).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(authState.signOut).toHaveBeenCalledTimes(2);
      expect(queryState.clear).toHaveBeenCalledTimes(2);
      expect(routerState.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
