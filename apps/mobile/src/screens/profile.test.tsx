import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
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

function renderWithQueryClient(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

describe('ProfileScreen', () => {
  it('renderiza iniciais, contexto de aluno independente e evolução', async () => {
    authState.session.data = {
      user: {
        id: 'auth-user-id',
        name: 'Maria Clara Silva',
        email: 'maria@example.com',
        role: 'student',
      },
    };

    renderWithQueryClient(<ProfileScreen />);

    expect(await screen.findByText('MC')).toBeTruthy();
    expect(screen.getByText('Maria Clara Silva')).toBeTruthy();
    expect(screen.getByText('Aluno independente')).toBeTruthy();
    expect(screen.getByText('Treinos e evolução')).toBeTruthy();
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
    expect(screen.getByText('Aluno independente')).toBeTruthy();

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

    expect(await screen.findByText('Aluno independente')).toBeTruthy();
    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('Sem email cadastrado')).toBeTruthy();
  });
});
