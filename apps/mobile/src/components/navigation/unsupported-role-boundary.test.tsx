import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { UnsupportedRoleBoundary } from './unsupported-role-boundary';

const authState = vi.hoisted(() => ({ signOut: vi.fn() }));
const queryState = vi.hoisted(() => ({ clear: vi.fn() }));

vi.mock('../../lib/auth-client', () => ({
  authClient: {
    signOut: authState.signOut,
  },
}));

vi.mock('../../lib/query-client', () => ({
  queryClient: queryState,
}));

vi.mock('../ui/screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../ui/state-panel', () => ({
  StatePanel: ({
    actionLabel,
    description,
    onAction,
    title,
  }: {
    actionLabel?: string;
    description: string;
    onAction?: () => void;
    title: string;
  }) => (
    <>
      <Text>{title}</Text>
      <Text>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessible
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
        >
          <Text>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </>
  ),
}));

vi.mock('../ui/inline-message', () => ({
  InlineMessage: ({ message }: { message: string }) => <Text>{message}</Text>,
}));

describe('UnsupportedRoleBoundary', () => {
  it('bloqueia role desconhecida, encerra a sessão e não expõe conteúdo protegido', async () => {
    const user = userEvent.setup();
    authState.signOut.mockResolvedValueOnce(undefined);

    render(<UnsupportedRoleBoundary />);

    expect(screen.getByText('Perfil não reconhecido')).toBeTruthy();
    expect(screen.queryByText('conteúdo protegido')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Sair e voltar ao login' }));

    await waitFor(() => {
      expect(authState.signOut).toHaveBeenCalledOnce();
      expect(queryState.clear).toHaveBeenCalledOnce();
    });
  });

  it('ignora um segundo toque enquanto encerra a sessão', async () => {
    const user = userEvent.setup();
    let resolveSignOut: (() => void) | undefined;
    const signOutPromise = new Promise<void>((resolve) => {
      resolveSignOut = resolve;
    });
    authState.signOut.mockImplementationOnce(() => signOutPromise);

    render(<UnsupportedRoleBoundary />);

    const logoutButton = screen.getByRole('button', { name: 'Sair e voltar ao login' });
    await user.press(logoutButton);
    await user.press(logoutButton);

    expect(authState.signOut).toHaveBeenCalledOnce();
    expect(screen.getByText('Saindo...')).toBeTruthy();

    resolveSignOut?.();

    await waitFor(() => {
      expect(queryState.clear).toHaveBeenCalledOnce();
    });
  });

  it('limpa o cache e mantém o bloqueio quando o encerramento falha', async () => {
    const user = userEvent.setup();
    authState.signOut.mockRejectedValueOnce(new Error('offline'));

    render(<UnsupportedRoleBoundary />);

    await user.press(screen.getByRole('button', { name: 'Sair e voltar ao login' }));

    expect(
      await screen.findByText('Não foi possível encerrar esta sessão. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.getByText('Perfil não reconhecido')).toBeTruthy();
    expect(queryState.clear).toHaveBeenCalledOnce();
  });
});
