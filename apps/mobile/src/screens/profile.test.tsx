import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { type ReactNode, createElement } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { colors, controlSizes, fontFamilies, radii, sharedStyles } from '../lib/styles';
import { ProfileScreen } from './profile';

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
    } as { user: { id: string; name: string; email: string; role: string } } | null,
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

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

vi.mock('expo-router', () => ({
  router: routerState,
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: Record<string, unknown>) => createElement('Ionicons', props),
}));

function renderWithQueryClient(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

describe('ProfileScreen', () => {
  it('apresenta a hierarquia visual e os detalhes do perfil do aluno', async () => {
    authState.session.data = {
      user: {
        id: 'auth-user-id',
        name: 'Maria Clara Silva',
        email: 'maria@example.com',
        role: 'student',
      },
    };

    renderWithQueryClient(<ProfileScreen />);

    expect(await screen.findByText('PERFIL')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Meu perfil' })).toBeTruthy();
    expect(screen.getByText('Seus dados e preferências de conta.')).toBeTruthy();
    expect(await screen.findByText('MC')).toBeTruthy();
    expect(screen.getByText('Maria Clara Silva')).toBeTruthy();
    expect(screen.getAllByText('Aluno independente')).toHaveLength(2);
    expect(screen.getByText('Tipo de conta')).toBeTruthy();
    expect(screen.getByText('Acesso')).toBeTruthy();
    expect(screen.getByText('Treinos e evolução')).toBeTruthy();
    expect(screen.getByTestId('profile-account-icon')).toBeTruthy();
    expect(screen.getByTestId('profile-access-icon')).toBeTruthy();

    expect(StyleSheet.flatten(screen.getByTestId('profile-avatar').props.style)).toMatchObject({
      backgroundColor: colors.primary,
      borderRadius: radii.pill,
      height: controlSizes.profileAvatar,
      width: controlSizes.profileAvatar,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('profile-identity-card').props.style),
    ).toMatchObject({
      borderRadius: radii.control,
      padding: 20,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('profile-details-card').props.style),
    ).toMatchObject({
      borderRadius: radii.control,
      paddingHorizontal: 16,
      paddingVertical: 4,
    });
    expect(
      StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle),
    ).toMatchObject({
      flexGrow: 1,
      justifyContent: 'space-between',
    });
  });

  it('mantém o estado de carregamento da sessão', () => {
    authState.session.data = null;
    authState.session.isPending = true;

    renderWithQueryClient(<ProfileScreen />);

    expect(screen.getByText('Carregando perfil')).toBeTruthy();
    expect(screen.getByText('Estamos carregando seus dados.')).toBeTruthy();

    authState.session.isPending = false;
  });

  it('encerra a autenticação Better Auth e limpa o cache no sucesso', async () => {
    const user = userEvent.setup();
    authState.signOut.mockResolvedValueOnce(undefined);
    authState.session.data = {
      user: {
        id: 'auth-user-id',
        name: 'Ana Aluna',
        email: 'ana@example.com',
        role: 'student',
      },
    };

    renderWithQueryClient(<ProfileScreen />);

    expect(await screen.findByText('Ana Aluna')).toBeTruthy();
    expect(screen.getByText('AA')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getAllByText('Aluno independente')).toHaveLength(2);

    await user.press(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(authState.signOut).toHaveBeenCalledOnce();
      expect(queryState.clear).toHaveBeenCalledOnce();
      expect(routerState.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('limpa o cache mesmo quando o logout falha e mantém o erro na tela', async () => {
    const user = userEvent.setup();
    authState.signOut.mockRejectedValueOnce(new Error('offline'));
    authState.session.data = {
      user: {
        id: 'auth-user-id',
        name: 'Ana Aluna',
        email: 'ana@example.com',
        role: 'student',
      },
    };

    renderWithQueryClient(<ProfileScreen />);

    await user.press(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Não foi possível sair agora.')).toBeTruthy();
    expect(queryState.clear).toHaveBeenCalledOnce();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it('renderiza valores seguros quando a sessão está ausente', async () => {
    authState.session.data = null;

    renderWithQueryClient(<ProfileScreen />);

    expect(await screen.findAllByText('Aluno independente')).toHaveLength(2);
    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('Sem email cadastrado')).toBeTruthy();
  });

  it('aceita contexto de apresentação de treinador sem duplicar o fluxo de logout', async () => {
    authState.session.data = {
      user: {
        id: 'auth-user-id',
        name: 'João Silva',
        email: 'joao@example.com',
        role: 'trainer',
      },
    };

    renderWithQueryClient(
      <ProfileScreen
        accessDescription="Alunos e treinos"
        accountType="Treinador"
        fallbackInitials="TR"
        fallbackName="Treinador"
        subtitle="Sua conta e visão de treinador."
      />,
    );

    expect(screen.getAllByText('Treinador')).toHaveLength(2);
    expect(screen.getByText('João Silva')).toBeTruthy();
    expect(screen.getByText('JS')).toBeTruthy();
    expect(screen.getByText('joao@example.com')).toBeTruthy();
    expect(screen.getByText('Sua conta e visão de treinador.')).toBeTruthy();
    expect(screen.getByText('Alunos e treinos')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('profile-header').props.style)).toMatchObject(
      sharedStyles.header,
    );
    expect(StyleSheet.flatten(screen.getByText('PERFIL').props.style)).toMatchObject({
      color: colors.primaryText,
    });
    expect(
      StyleSheet.flatten(screen.getByRole('header', { name: 'Meu perfil' }).props.style),
    ).toMatchObject(sharedStyles.title);
    expect(
      StyleSheet.flatten(screen.getByTestId('profile-identity-card').props.style),
    ).toMatchObject({
      borderRadius: radii.md,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('profile-details-card').props.style),
    ).toMatchObject({
      borderRadius: radii.md,
    });
    expect(StyleSheet.flatten(screen.getByTestId('profile-role-badge').props.style)).toMatchObject({
      backgroundColor: '#EBF5FB',
    });
    expect(StyleSheet.flatten(screen.getByTestId('profile-role-dot').props.style)).toMatchObject({
      backgroundColor: '#3498DB',
    });
    expect(StyleSheet.flatten(screen.getAllByText('Treinador')[0].props.style)).toMatchObject({
      color: '#3498DB',
    });
    expect(screen.getByTestId('profile-account-icon').props.name).toBe('person-outline');
    expect(screen.getByTestId('profile-access-icon').props.name).toBe('people-outline');
    expect(StyleSheet.flatten(screen.getByText('Tipo de conta').props.style)).toMatchObject({
      color: colors.muted,
      fontFamily: fontFamilies.body,
      fontSize: 11,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('profile-avatar').props.children.props.style),
    ).toMatchObject({
      fontFamily: fontFamilies.heading,
      fontSize: 28,
      fontWeight: '700',
    });
    expect(StyleSheet.flatten(screen.getByText('João Silva').props.style)).toMatchObject({
      fontFamily: fontFamilies.heading,
      fontSize: 22,
      fontWeight: '700',
    });
  });
});
