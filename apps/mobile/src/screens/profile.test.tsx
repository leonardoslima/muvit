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

vi.mock('expo-router', () => ({
  router: routerState,
}));

function renderWithQueryClient(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

describe('ProfileScreen', () => {
  it('renderiza a sessão e encerra a autenticação', async () => {
    const user = userEvent.setup();
    authState.signOut.mockResolvedValueOnce(undefined);

    renderWithQueryClient(<ProfileScreen />);

    expect(await screen.findByText('Ana Aluna')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('Tipo de conta: Aluno')).toBeTruthy();

    await user.press(screen.getByText('Sair'));

    await waitFor(() => {
      expect(authState.signOut).toHaveBeenCalledOnce();
      expect(queryState.clear).toHaveBeenCalledOnce();
      expect(routerState.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('renderiza valores seguros quando a sessão está ausente', async () => {
    authState.session.data = null;

    renderWithQueryClient(<ProfileScreen />);
    expect(await screen.findByText('Aluno')).toBeTruthy();
    expect(screen.getByText('Sem email cadastrado')).toBeTruthy();
  });
});
